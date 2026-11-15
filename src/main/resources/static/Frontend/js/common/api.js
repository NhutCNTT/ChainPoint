// ChainPoint — Centralized API Client kết nối trực tiếp với MySQL Backend
// Thay thế hoàn toàn việc lưu trữ dữ liệu nghiệp vụ trên localStorage

const API = (() => {
    const isLiveServer = typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '';
    const BASE_URL = isLiveServer ? 'http://localhost:8080/api/v1' : ((typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? `${window.location.origin}/api/v1` : 'http://localhost:8080/api/v1');

    function getAuthToken() {
        return sessionStorage.getItem('cp_token') || localStorage.getItem('cp_token') || '';
    }

    async function request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {}),
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });
            
            if (response.status === 204) {
                return null;
            }

            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await response.json() : await response.text();

            if (!response.ok) {
                const message = (data && data.message) ? data.message : `Lỗi ${response.status}: ${response.statusText}`;
                throw new Error(message);
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, error);
            throw error;
        }
    }

    return {
        BASE_URL,
        get: (endpoint) => request(endpoint, { method: 'GET' }),
        post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
        put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
        patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
        delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
        setToken: (token) => sessionStorage.setItem('cp_token', token),
        clearToken: () => sessionStorage.removeItem('cp_token')
    };
})();

// Gắn toàn cục cho các trang web
window.API = API;
