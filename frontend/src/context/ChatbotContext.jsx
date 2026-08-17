import React, { createContext, useContext, useState } from 'react';

// => Holds chat state for both widget scopes at the App level, above
//    where the widget panels mount, so closing a panel only hides it -
//    the conversation itself is not cleared until a full page refresh
//    remounts App.jsx (and this provider) from scratch. No state
//    library was already in this codebase's package.json, so this uses
//    plain React Context instead of adding a new dependency.
const ChatbotContext = createContext(null);

export function ChatbotProvider({ children }) {
    // => Keyed dynamically rather than fixed public_site/student_dashboard
    //    properties, since course-scoped bots need one independent thread
    //    per course (e.g. "tesda_course_14" vs "tesda_course_22"), not
    //    one shared thread for the entire tesda_course scope. Widgets that
    //    don't pass a courseId (public_site, student_dashboard) just use
    //    the plain scope string as their key, so nothing changes for them.
    const [state, setState] = useState({});

    const setMessages = (key, messages) => {
        setState((prev) => ({
            ...prev,
            [key]: { isOpen: prev[key]?.isOpen || false, messages },
        }));
    };

    const setIsOpen = (key, isOpen) => {
        setState((prev) => ({
            ...prev,
            [key]: { messages: prev[key]?.messages || [], isOpen },
        }));
    };

    return (
        <ChatbotContext.Provider value={{ state, setMessages, setIsOpen }}>
            {children}
        </ChatbotContext.Provider>
    );
}

export function useChatbotContext() {
    return useContext(ChatbotContext);
}