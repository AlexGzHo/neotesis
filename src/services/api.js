// Trace: Relative path for unified build (Docker) and Vite Proxy (Dev)
const BASE_URL = '';

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
        LOGIN: `${BASE_URL}/api/v2/auth/login`,
        REGISTER: `${BASE_URL}/api/v2/auth/register`,
        ME: `${BASE_URL}/api/v2/auth/me`,
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
