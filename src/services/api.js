// Centralized API endpoints
// Note: Vite proxy handles /api -> http://localhost:8080 during development

export const API_ENDPOINTS = {
    CHAT: {
        SEND: '/api/chat',
        HISTORY: '/api/chats',
        GET_CHAT: (id) => `/api/chats/${id}`,
        DELETE: (id) => `/api/chats/${id}`,
    },
    CITATION: {
        PROXY: '/api/proxy',
    },
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        ME: '/api/auth/me',
    }
};

// Legacy compatible export if needed, but transitioning to API_ENDPOINTS
export const api = {
    chat: {
        sendMessage: (body) => ({
            url: API_ENDPOINTS.CHAT.SEND,
            method: 'POST',
            body: JSON.stringify(body)
        })
    },
    citation: {
        proxy: (targetUrl) => ({
            url: `${API_ENDPOINTS.CITATION.PROXY}?url=${encodeURIComponent(targetUrl)}`,
            method: 'GET'
        })
    }
};
