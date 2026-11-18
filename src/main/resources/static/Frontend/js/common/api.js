// ChainPoint — Centralized API Client kết nối trực tiếp với MySQL Backend
// Thay thế hoàn toàn việc lưu trữ dữ liệu nghiệp vụ trên localStorage

(function applyRoleTheme() {
    try {
        const storedRole = sessionStorage.getItem('cp_role') || localStorage.getItem('cp_role') || 'owner';
        const normalized = String(storedRole).trim().toLowerCase().replace(/^role_/, '');
        const aliases = { employee: 'cashier', pos: 'cashier', branch: 'manager' };
        const role = aliases[normalized] || normalized;
        const activeRole = ['owner', 'manager', 'cashier'].includes(role) ? role : 'owner';
        document.documentElement.setAttribute('data-role', activeRole);
        if (document.body) {
            document.body.setAttribute('data-role', activeRole);
        }
    } catch (error) {
        console.warn('[Theme] Unable to apply role theme:', error);
    }
})();

const API = (() => {
    const isLiveServer = typeof window !== 'undefined' && window.location.port && ['5500', '5501'].includes(window.location.port) && window.location.port !== '';
    const BASE_URL = isLiveServer ? 'http://localhost:8080/api/v1' : ((typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? `${window.location.origin}/api/v1` : 'http://localhost:8080/api/v1');

    function getAuthToken() {
        return sessionStorage.getItem('cp_token') || localStorage.getItem('cp_token') || '';
    }

    function clearSession() {
        ['cp_token', 'cp_user', 'cp_role', 'cp_branch', 'cp_branch_id'].forEach((key) => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });
    }

    function handleUnauthorized() {
        clearSession();

        if (typeof window === 'undefined') {
            return;
        }

        if (!window.location.pathname.includes('/auth/')) window.location.replace('/Frontend/pages/auth/login.html');
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

            if (response.status === 401) {
                handleUnauthorized();
                throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
            }

            if (response.status === 204) {
                return null;
            }

            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await response.json() : await response.text();

            if (!response.ok) {
                const message = (data && data.message) ? data.message : `Lỗi ${response.status}: ${response.statusText}`;
                const error = new Error(message); error.status = response.status; throw error;
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
        clearToken: clearSession
    };
})();

// Gắn toàn cục cho các trang web
window.API = API;
