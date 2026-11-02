// ChainPoint — Shared app-shell logic (sidebar, user chip, auth guard, logout)
// Used by: admin/*.html (data-area="admin") and employee/*.html (data-area="employee")

(function () {
    // Home page of each role, relative to admin/ or employee/ folders
    const HOME = {
        owner: '../admin/dashboard.html',
        employee: '../employee/pos.html'
    };
    // Which role is allowed in which area
    const AREA_ROLE = { admin: 'owner', employee: 'employee' };

    // Signed-in user (set by js/auth/login.js — localStorage if "remember me", else sessionStorage)
    const get = key => sessionStorage.getItem(key) || localStorage.getItem(key);
    const user = get('cp_user');
    const role = get('cp_role');

    // Not logged in → back to login page
    if (!user || !HOME[role]) {
        window.location.replace('../auth/login.html');
        return;
    }

    // Wrong area for this role → send to the role's home page
    const area = document.body.dataset.area;
    if (AREA_ROLE[area] && AREA_ROLE[area] !== role) {
        window.location.replace(HOME[role]);
        return;
    }

    // Highlight the current page in the sidebar
    const current = location.pathname.split('/').pop();
    document.querySelectorAll('.nav a').forEach(link => {
        if (link.getAttribute('href') === current) link.classList.add('active');
    });

    // User chip
    const roleLabels = { owner: 'Chủ cửa hàng', employee: 'Nhân viên' };
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    const avatarEl = document.getElementById('userAvatar');
    if (nameEl) nameEl.textContent = user;
    if (roleEl) roleEl.textContent = roleLabels[role];
    if (avatarEl) avatarEl.textContent = user.charAt(0).toUpperCase();

    // Logout → clear session and go back to login page
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            ['cp_role', 'cp_user'].forEach(k => {
                sessionStorage.removeItem(k);
                localStorage.removeItem(k);
            });
            window.location.href = '../auth/login.html';
        });
    }
})();
