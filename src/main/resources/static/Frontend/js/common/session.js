/* Shared session, role routes and branch context. Backend authorization remains authoritative. */
(() => {
    window.escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const read = key => sessionStorage.getItem(key) || localStorage.getItem(key) || '';
    const normalizeRole = value => ({ admin: 'owner', branch: 'manager', employee: 'cashier', pos: 'cashier' })[String(value || '').toLowerCase().replace(/^role_/, '')]
        || (['owner', 'manager', 'cashier'].includes(String(value || '').toLowerCase().replace(/^role_/, '')) ? String(value).toLowerCase().replace(/^role_/, '') : null);
    const home = role => role === 'owner' ? '/Frontend/pages/owner/dashboard.html' : role === 'manager' ? '/Frontend/pages/branch/dashboard.html' : '/Frontend/pos/index.html';
    const base = location.protocol === 'file:' || ['5500', '5501'].includes(location.port) ? 'http://localhost:8080' : location.origin;
    const keys = ['cp_token', 'cp_token_type', 'cp_user', 'cp_role', 'cp_branch', 'cp_branch_id', 'cp_branch_ids'];
    const nativeFetch = window.fetch.bind(window);
    const protectedPage = /\/pages\/(owner|admin|branch|employee)\/|\/pos\//.test(location.pathname);
    let role = normalizeRole(read('cp_role'));
    let branches = [];
    const clear = () => [sessionStorage, localStorage].forEach(storage => {
        keys.forEach(key => storage.removeItem(key));
        Object.keys(storage).filter(key => key.startsWith('cp_pos_') || key.startsWith('pos_loyalty_')).forEach(key => storage.removeItem(key));
    });
    const login = () => { clear(); location.replace('/Frontend/pages/auth/login.html'); };
    const notify = message => {
        const show = () => {
            let banner = document.getElementById('cp-api-error');
            if (!banner) {
                banner = document.createElement('div'); banner.id = 'cp-api-error'; banner.setAttribute('role', 'alert');
                banner.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:10000;padding:16px;border-radius:12px;background:#991b1b;color:white;cursor:pointer';
                banner.onclick = () => banner.remove(); document.body.appendChild(banner);
            }
            banner.textContent = message;
        };
        if (document.body) show(); else document.addEventListener('DOMContentLoaded', show, { once: true });
    };

    // Pick a UI context from signed claims immediately, then refresh assignments from the server.
    try {
        const token = read('cp_token');
        if (token) {
            const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (claims.exp * 1000 <= Date.now()) throw new Error('expired');
            role = normalizeRole(claims.role);
            if (!role) throw new Error('unknown role');
            sessionStorage.setItem('cp_role', role);
            const ids = (claims.branchIds || (claims.branchId ? [claims.branchId] : [])).map(String);
            const desired = new URLSearchParams(location.search).get('branchId') || read('cp_branch_id') || String(claims.branchId || '');
            sessionStorage.setItem('cp_branch_id', role === 'owner' || ids.includes(desired) ? desired : String(claims.branchId || ids[0] || ''));
        } else if (protectedPage) login();
    } catch (error) { if (protectedPage) login(); }

    const allowedPage = currentRole => {
        const path = location.pathname;
        if (/\/pages\/(owner|admin)\//.test(path)) return currentRole === 'owner';
        if (/\/pages\/branch\//.test(path)) return currentRole === 'owner' || currentRole === 'manager';
        return Boolean(currentRole);
    };
    const ready = protectedPage ? (async () => {
        const response = await nativeFetch(`${base}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${read('cp_token')}` } });
        if (response.status === 401) { login(); throw new Error('Authentication required'); }
        if (!response.ok) throw new Error('Không thể xác minh phiên đăng nhập. Vui lòng tải lại.');
        const user = await response.json(); role = normalizeRole(user.role);
        if (!allowedPage(role)) { location.replace(home(role)); throw new Error('Role access denied'); }
        sessionStorage.setItem('cp_role', role); sessionStorage.setItem('cp_user', user.fullName || user.username);
        sessionStorage.setItem('cp_branch_ids', JSON.stringify(user.branchIds || []));
        const branchResponse = await nativeFetch(`${base}/api/v1/branches`, { headers: { Authorization: `Bearer ${read('cp_token')}` } });
        if (!branchResponse.ok) throw new Error('Không thể tải chi nhánh được phân công.');
        branches = await branchResponse.json();
        const selected = branches.find(branch => String(branch.id) === read('cp_branch_id')) || branches.find(branch => branch.id === user.branchId) || branches[0];
        if (selected) { sessionStorage.setItem('cp_branch_id', selected.id); sessionStorage.setItem('cp_branch', selected.name); }
        else { sessionStorage.removeItem('cp_branch_id'); sessionStorage.removeItem('cp_branch'); }
        document.documentElement.dataset.role = role;
        return user;
    })() : Promise.resolve(null);
    ready.catch(error => notify(error.message));

    // Include current branch for operational screens and surface failed requests consistently,
    // including older modules which still use fetch directly.
    window.fetch = async (input, options = {}) => {
        let url = new URL(typeof input === 'string' ? input : input.url, location.href);
        if (url.pathname.startsWith('/api/v1/') && !url.pathname.startsWith('/api/v1/auth/') && !url.pathname.includes('/provider-confirmation')) {
            await ready;
            const operational = /\/pages\/branch\/|\/pages\/employee\/|\/pos\//.test(location.pathname);
            if (operational && read('cp_branch_id') && /^\/api\/v1\/(products|tables|orders|customers|staff|loyalty\/transactions|admin\/dashboard\/[^/]+)$/.test(url.pathname) && !url.searchParams.has('branchId')) url.searchParams.set('branchId', read('cp_branch_id'));
        }
        let response;
        try { response = await nativeFetch(url.href, options); }
        catch (error) { notify('Không thể kết nối máy chủ. Dữ liệu chưa được lưu.'); throw error; }
        if (response.status === 401 && !url.pathname.endsWith('/auth/login')) login();
        if (!response.ok && ![401, 404].includes(response.status)) {
            const data = await response.clone().json().catch(() => null);
            notify(data?.message || `Yêu cầu thất bại (${response.status}).`);
        }
        return response;
    };

    async function logout() {
        try { await nativeFetch(`${base}/api/v1/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${read('cp_token')}` } }); }
        finally { login(); }
    }

    const ownerMenu = [['Dashboard', 'owner/dashboard'], ['Chi nhánh', 'admin/branches'], ['Quản lý', 'admin/staff?role=manager'], ['Nhân viên', 'admin/staff'], ['Sản phẩm', 'branch/menu'], ['Bàn', 'branch/tables'], ['Đơn hàng', 'admin/orders'], ['Khách hàng', 'branch/customers'], ['Loyalty', 'branch/loyalty'], ['Doanh thu & Báo cáo', 'owner/revenue-comparison'], ['Cài đặt', 'branch/settings']];
    const managerMenu = [['Dashboard', 'branch/dashboard'], ['Sản phẩm & Thực đơn', 'branch/menu'], ['Bàn', 'branch/tables'], ['Đơn hàng', 'branch/orders'], ['Thu ngân', 'branch/staff'], ['Khách hàng', 'branch/customers'], ['Loyalty', 'branch/loyalty'], ['Báo cáo', 'branch/revenue'], ['Cài đặt chi nhánh', 'branch/settings']];
    const cashierMenu = [['POS / Bàn', '/Frontend/pos/index.html'], ['Đơn hàng', 'employee/orders'], ['Thanh toán', '/Frontend/pos/pending.html'], ['Khách hàng', 'employee/customers'], ['Lịch sử giao dịch', '/Frontend/pos/history.html'], ['Hồ sơ', 'employee/profile']];
    const href = path => path.startsWith('/') ? path : '/Frontend/pages/' + path.replace(/\?/, '.html?') + (path.includes('?') ? '' : '.html');

    async function mount() {
        await ready;
        const nav = document.querySelector('#branchNav, #sidebarNav, .sidebar .nav');
        if (nav) {
            nav.replaceChildren();
            const items = role === 'owner' ? ownerMenu : role === 'manager' ? managerMenu : cashierMenu;
            items.forEach(([label, path]) => {
                const link = document.createElement('a'); link.href = href(path); link.textContent = label;
                if (new URL(link.href).pathname === location.pathname) link.className = 'active'; nav.appendChild(link);
            });
            if (role !== 'cashier') {
                const pos = document.createElement('a'); pos.href = '/Frontend/pos/index.html'; pos.textContent = 'Mở POS'; nav.appendChild(pos);
            }
        }
        document.querySelectorAll('#userName, #branchUserName').forEach(el => el.textContent = read('cp_user'));
        document.querySelectorAll('#ownerUserName').forEach(el => el.textContent = read('cp_user'));
        document.querySelectorAll('#userRole, #branchUserRole').forEach(el => el.textContent = { owner: 'Chủ chuỗi', manager: 'Quản lý', cashier: 'Thu ngân' }[role]);
        document.querySelectorAll('#userAvatar, #branchUserAvatar').forEach(el => el.textContent = read('cp_user').charAt(0));
        document.querySelectorAll('#logoutBtn, #branchLogoutBtn, #ownerLogoutBtn').forEach(el => {
            el.addEventListener('click', event => { event.preventDefault(); event.stopImmediatePropagation(); logout(); }, { capture: true });
        });
        if (role === 'manager') document.querySelectorAll('select[id*="Role"] option, select[id="staffRole"] option').forEach(option => { if (!/cashier/i.test(option.value)) option.remove(); });
        if (role !== 'owner') document.querySelectorAll('#loyaltySettingsForm input, #loyaltySettingsForm button, #loyaltyConfigForm input, #loyaltyConfigForm button').forEach(el => el.disabled = true);
        if (branches.length > 1 && !document.getElementById('cp-branch-switch')) {
            const select = document.createElement('select'); select.id = 'cp-branch-switch'; select.setAttribute('aria-label', 'Chi nhánh đang thao tác');
            branches.forEach(branch => { const option = new Option(branch.name, branch.id); select.add(option); });
            select.value = read('cp_branch_id'); select.style.cssText = 'max-width:220px;margin:8px;padding:8px';
            select.onchange = () => { const branch = branches.find(b => String(b.id) === select.value); sessionStorage.setItem('cp_branch_id', branch.id); sessionStorage.setItem('cp_branch', branch.name); location.href = location.pathname; };
            (document.querySelector('.topbar, .top-header') || document.body).appendChild(select);
        }
    }
    window.CP = { ready, mount, logout, home, normalizeRole, notify, get role() { return role; }, get branches() { return branches; } };
    if (protectedPage) document.addEventListener('DOMContentLoaded', () => mount().catch(error => notify(error.message)));
})();
