import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import axiosStudent from '../../../utils/axiosStudent';
import { useChatbotContext } from '../../../context/ChatbotContext.jsx';
import chatBubbleIcon from '../../../assets/icons/chat-bubble.png';
import closeIcon from '../../../assets/icons/close.png';
import './chatbotWidget.css';

// => Same allowlist as the backend's chatbotGeminiService.js sanitizeHtml
//    call - defense-in-depth second pass right before the sink
const SANITIZE_CONFIG = {
    ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
};

// => scope is either 'public_site' or 'student_dashboard' - App.jsx
//    decides which one (or neither) to render based on the current route
// => courseId is only passed by tesda_course/shs_course usages
//    (TESDACourseDetail/SHSCourseDetail) - omitted entirely for
//    public_site
export default function ChatbotWidget({ scope, courseId }) {
    const { state, setMessages, setIsOpen } = useChatbotContext();
    // => Course-scoped widgets get their own key per course, so switching
    //    between two course pages doesn't bleed one course's conversation
    //    into another's widget
    const chatKey = courseId ? `${scope}_${courseId}` : scope;
    const { messages = [], isOpen = false } = state[chatKey] || {};

    const [chatbot, setChatbot] = useState(null); // => { public_id, widget_header_title, welcome_message }
    const [configLoaded, setConfigLoaded] = useState(false);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);

    // => Refetches whenever scope or courseId changes - matters for course
    //    pages, since navigating from one course detail page to another
    //    re-renders this component with new props rather than remounting it
    useEffect(() => {
        setConfigLoaded(false);
        setChatbot(null);

        const fetchActiveChatbot = async () => {
            try {
                const url = courseId ? `/chatbots/active/${scope}/${courseId}` : `/chatbots/active/${scope}`;
                const res = await axiosStudent.get(url);
                setChatbot(res.data.data);
            } catch (error) {
                console.error('Failed to fetch active chatbot:', error);
            } finally {
                setConfigLoaded(true);
            }
        };
        fetchActiveChatbot();
    }, [scope, courseId]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || sending || !chatbot) return;

        const updatedMessages = [...messages, { role: 'user', text: trimmed }];
        setMessages(chatKey, updatedMessages);
        setInput('');
        setSending(true);

        try {
            const res = await axiosStudent.post(`/chatbots/${chatbot.public_id}/message`, {
                messages: updatedMessages,
            });
            setMessages(chatKey, [...updatedMessages, { role: 'model', text: res.data.reply }]);
        } catch (error) {
            console.error('Chatbot message failed:', error);
            const errorText = error.response?.data?.message || 'Sorry, something went wrong. Please try again.';
            setMessages(chatKey, [...updatedMessages, { role: 'model', text: errorText, isError: true }]);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // => Nothing active for this scope yet, or still loading - render nothing
    if (!configLoaded || !chatbot) return null;

    return (
        <>
            {!isOpen && (
                <button
                    className="chatbot-widget-fab"
                    onClick={() => setIsOpen(chatKey, true)}
                    title={chatbot.widget_header_title}
                >
                    <img src={chatBubbleIcon} alt="Open chat" className="chatbot-widget-fab-icon" />
                </button>
            )}

            {isOpen && (
                <div className="chatbot-widget-panel">
                    <div className="chatbot-widget-header">
                        <div className="chatbot-widget-header-title">
                            <img src={chatBubbleIcon} alt="" className="chatbot-widget-header-icon" />
                            {chatbot.widget_header_title}
                        </div>
                        <button
                            className="chatbot-widget-close-btn"
                            onClick={() => setIsOpen(chatKey, false)}
                            title="Minimize chat"
                        >
                            <img src={closeIcon} alt="Close" className="chatbot-widget-close-icon" />
                        </button>
                    </div>

                    <div className="chatbot-widget-messages">
                        <div className="chatbot-widget-bubble chatbot-widget-bubble-bot">
                            <span className="chatbot-widget-bubble-label">Bot</span>
                            {chatbot.welcome_message}
                        </div>

                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`chatbot-widget-bubble ${m.role === 'user' ? 'chatbot-widget-bubble-user' : 'chatbot-widget-bubble-bot'} ${m.isError ? 'chatbot-widget-bubble-error' : ''}`}
                            >
                                <span className="chatbot-widget-bubble-label">{m.role === 'user' ? 'You' : 'Bot'}</span>
                                {/* => Bot replies are already sanitized server-side, this is a
                                       second pass right before the sink. User's own text never
                                       goes through dangerouslySetInnerHTML. */}
                                {m.role === 'user' ? m.text : <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.text, SANITIZE_CONFIG) }} />}
                            </div>
                        ))}

                        {sending && (
                            <div className="chatbot-widget-bubble chatbot-widget-bubble-bot chatbot-widget-bubble-typing">
                                <span className="chatbot-widget-bubble-label">Bot</span>
                                Typing…
                            </div>
                        )}
                    </div>

                    <div className="chatbot-widget-input-row">
                        <input
                            type="text"
                            className="chatbot-widget-input"
                            placeholder="Type your message here..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={sending}
                        />
                        <button
                            className="chatbot-widget-send-btn"
                            onClick={handleSend}
                            disabled={sending || !input.trim()}
                        >
                            Send
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}