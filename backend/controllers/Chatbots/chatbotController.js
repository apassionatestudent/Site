// controllers/Chatbots/chatbotController.js
// => Thin HTTP layer only, mirrors the admin side's controller shape.

import { getActiveChatbotService, sendChatbotMessageService } from '../../services/Chatbots/chatbotService.js';

export async function getActiveChatbot(req, res) {
    try {
        // => courseId is undefined on the two-segment public_site /
        //    student_dashboard URL, and a string on the three-segment
        //    tesda_course / shs_course URL - getActiveChatbotService
        //    handles both cases
        const chatbot = await getActiveChatbotService(req.params.scope, req.params.courseId);
        res.status(200).json({ data: chatbot });
    } catch (error) {
        console.error('Failed to fetch active chatbot:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Failed to load chatbot.' });
    }
}

export async function sendChatbotMessage(req, res) {
    try {
        const reply = await sendChatbotMessageService(req.params.publicId, req.body.messages);
        res.status(200).json({ reply });
    } catch (error) {
        console.error('Failed to send chatbot message:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Failed to send message.' });
    }
}