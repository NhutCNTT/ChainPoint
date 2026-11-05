// ChainPoint — Branch Management Shared Navigation & Context
// Used by all pages in pages/branch/*.html

(function () {
    const urlParams = new URLSearchParams(window.location.search);
    const branchFromUrl = urlParams.get('branch');
    if (branchFromUrl) {
        localStorage.setItem('cp_branch', branchFromUrl);
        sessionStorage.setItem('cp_branch', branchFromUrl);
    }

    const getStorage = k => sessionStorage.getItem(k) || localStorage.getItem(k);
    const user = getStorage('cp_user') || 'Quản lý cơ sở';
    const role = getStorage('cp_role') || 'manager';
    const currentBranch = getStorage('cp_branch') || 'Chi nhánh Quận 1';

    const currentFile = location.pathname.split('/').pop() || 'dashboard.html';

    // 9 Sidebar Items with clean SVG icons
    const BRANCH_MENU = [
        {
            file: 'dashboard.html',
            title: 'Tổng quan',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`
        },
        {
            file: 'tables.html',
            title: 'Quản lý bàn',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`
        },
        {
            file: 'menu.html',
            title: 'Thực đơn',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
        },
        {
            file: 'orders.html',
            title: 'Đơn hàng',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6"/><path d="M9 12h6"/></svg>`
        },
        {
            file: 'staff.html',
            title: 'Nhân viên',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1.2-3.2 3.7-4.8 6.5-4.8s5.3 1.6 6.5 4.8"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 15.5c1.6.6 2.8 2 3.5 4.5"/></svg>`
        },
        {
            file: 'customers.html',
            title: 'Khách hàng',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
        },
        {
            file: 'loyalty.html',
            title: 'Tích điểm Loyalty',
            badge: 'BHX',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`
        },
        {
            file: 'revenue.html',
            title: 'Doanh thu',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
        },
        {
            file: 'settings.html',
            title: 'Cài đặt',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
        }
    ];

    const navEl = document.getElementById('branchNav');
    if (navEl) {
        const isOwner = role === 'owner';
        let navHtml = '';

        if (isOwner) {
            navHtml += `
                <a href="../owner/dashboard.html" style="background:var(--primary-soft); color:var(--primary); font-weight:700; margin-bottom:8px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;"><polyline points="15 18 9 12 15 6"/></svg>
                    <span>Về Owner Dashboard</span>
                </a>
            `;
        }

        navHtml += `
            <div class="nav-section">Quản Trị Chi Nhánh</div>
        `;

        BRANCH_MENU.forEach(item => {
            const isActive = currentFile === item.file ? 'active' : '';
            const queryParam = branchFromUrl ? `?branch=${encodeURIComponent(currentBranch)}` : '';
            navHtml += `
                <a href="${item.file}${queryParam}" class="${isActive}">
                    ${item.icon}
                    <span>${item.title}</span>
                    ${item.badge ? `<span class="badge badge-warning" style="margin-left:auto; font-size:10px; padding:1px 6px;">${item.badge}</span>` : ''}
                </a>
            `;
        });

        // Quick POS launcher link
        navHtml += `
            <div class="nav-divider"></div>
            <a href="../../pos/index.html" style="color:var(--success); font-weight:600;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>
                <span>Mở máy POS bán hàng</span>
            </a>
        `;

        navEl.innerHTML = navHtml;
    }

    // Topbar User Info
    const branchTitleEl = document.getElementById('branchCurrentName');
    const userRoleEl = document.getElementById('branchUserRole');
    const userNameEl = document.getElementById('branchUserName');
    const userAvatarEl = document.getElementById('branchUserAvatar');

    if (branchTitleEl) branchTitleEl.textContent = currentBranch;
    if (userNameEl) userNameEl.textContent = user;
    if (userAvatarEl) userAvatarEl.textContent = user.charAt(0).toUpperCase();
    if (userRoleEl) {
        userRoleEl.textContent = role === 'owner' ? `Chủ chuỗi · ${currentBranch}` : `Quản lý · ${currentBranch}`;
    }

    // Logout
    const logoutBtn = document.getElementById('branchLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (role === 'owner') {
                window.location.href = '../owner/dashboard.html';
            } else {
                localStorage.removeItem('cp_role');
                localStorage.removeItem('cp_user');
                window.location.href = '../auth/pos-login.html';
            }
        });
    }

    // Initialize UI utilities (Responsive navigation, data-labels, modal)
    function initUI() {
        // Mobile menu toggle
        let backdrop = document.querySelector('.sidebar-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'sidebar-backdrop';
            document.body.appendChild(backdrop);
        }
        backdrop.addEventListener('click', () => {
            document.body.classList.remove('sidebar-open');
        });

        const topbar = document.querySelector('.topbar');
        if (topbar && !topbar.querySelector('.menu-toggle')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'menu-toggle';
            toggleBtn.type = 'button';
            toggleBtn.setAttribute('aria-label', 'Mở menu');
            toggleBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            `;
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.body.classList.toggle('sidebar-open');
            });
            topbar.insertBefore(toggleBtn, topbar.firstChild);
        }

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') document.body.classList.remove('sidebar-open');
        });

        // Modals dismiss on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    overlay.classList.remove('is-open');
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUI);
    } else {
        initUI();
    }
})();
