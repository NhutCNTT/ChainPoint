// ChainPoint — Shared app-shell logic (sidebar navigation, user chip, role guard, logout)
// Used across all admin/manager/cashier management pages in pages/admin/

(function () {
    const get = key => sessionStorage.getItem(key) || localStorage.getItem(key);
    const user = get('cp_user');
    const role = get('cp_role') || 'owner';
    const branch = get('cp_branch') || 'Chi nhánh Quận 1';

    // 1. Kiểm tra đăng nhập — Chưa đăng nhập thì chuyển về trang login
    if (!user) {
        window.location.replace('../auth/login.html');
        return;
    }

    const currentFile = location.pathname.split('/').pop() || 'dashboard.html';

    // 2. Định nghĩa quyền truy cập các trang theo 3 vai trò
    const ROLE_PERMISSIONS = {
        owner: ['dashboard.html', 'branches.html', 'tables.html', 'orders.html', 'staff.html'],
        manager: ['dashboard.html', 'tables.html', 'orders.html', 'staff.html'],
        cashier: ['orders.html']
    };

    const allowedPages = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.owner;

    // Chặn truy cập nếu không có quyền
    if (!allowedPages.includes(currentFile)) {
        if (role === 'cashier') {
            window.location.replace('../../pos/index.html');
            return;
        } else if (role === 'manager') {
            window.location.replace('dashboard.html');
            return;
        } else {
            window.location.replace('dashboard.html');
            return;
        }
    }

    // 3. Xây dựng danh sách menu Sidebar tương ứng với từng vai trò
    const MENU_DEFINITIONS = {
        dashboard: {
            title: role === 'owner' ? 'Tổng quan chuỗi' : 'Tổng quan chi nhánh',
            href: 'dashboard.html',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`
        },
        branches: {
            title: 'Chi nhánh',
            href: 'branches.html',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v9h14v-9"/><path d="M10 19v-5h4v5"/></svg>`
        },
        pos: {
            title: 'Bán hàng (POS)',
            href: '../../pos/index.html',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>`,
            badge: 'Bán hàng'
        },
        tables: {
            title: 'Quản lý bàn',
            href: 'tables.html',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`
        },
        orders: {
            title: 'Đơn hàng',
            href: 'orders.html',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6"/><path d="M9 12h6"/></svg>`
        },
        staff: {
            title: role === 'owner' ? 'Quản lý nhân viên' : 'Nhân viên chi nhánh',
            href: 'staff.html',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1.2-3.2 3.7-4.8 6.5-4.8s5.3 1.6 6.5 4.8"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 15.5c1.6.6 2.8 2 3.5 4.5"/></svg>`
        }
    };

    const ROLE_MENUS = {
        owner: ['dashboard', 'branches', 'tables', 'orders', 'staff', 'pos'],
        manager: ['dashboard', 'pos', 'tables', 'orders', 'staff'],
        cashier: ['pos', 'orders']
    };

    const navEl = document.querySelector('.nav') || document.getElementById('sidebarNav');
    if (navEl) {
        const menuKeys = ROLE_MENUS[role] || ROLE_MENUS.owner;
        navEl.innerHTML = menuKeys.map(k => {
            const item = MENU_DEFINITIONS[k];
            if (!item) return '';
            const isActive = currentFile === item.href ? 'active' : '';
            return `
                <a href="${item.href}" class="${isActive}">
                    ${item.icon}
                    <span>${item.title}</span>
                </a>
            `;
        }).join('');
    }

    // 4. Cập nhật thông tin User Chip trên Topbar
    const roleLabels = {
        owner: 'Chủ chuỗi hệ thống',
        manager: `Quản lý — ${branch}`,
        cashier: `Thu ngân — ${branch}`
    };

    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    const avatarEl = document.getElementById('userAvatar');

    if (nameEl) nameEl.textContent = user;
    if (roleEl) roleEl.textContent = roleLabels[role] || role;
    if (avatarEl) avatarEl.textContent = user.charAt(0).toUpperCase();

    // 5. Nút đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            ['cp_role', 'cp_user', 'cp_branch'].forEach(k => {
                sessionStorage.removeItem(k);
                localStorage.removeItem(k);
            });
            window.location.href = '../auth/login.html';
        });
    }
})();
