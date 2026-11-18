// ChainPoint — Login page logic
// Dữ liệu kết nối trực tiếp 100% với MySQL Backend API (không dùng mock data)

const tabs = document.querySelector('.tabs');
const hint = document.querySelector('#roleHint span');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const roleConfigs = {
    owner: {
        hint: 'Quản lý toàn bộ chuỗi nhà hàng, tạo chi nhánh, xem doanh thu tổng và phân quyền toàn hệ thống.'
    },
    manager: {
        hint: 'Quản lý chi nhánh được phân công: cấu hình bàn, thực đơn, đơn hàng, POS và nhân sự chi nhánh.'
    },
    cashier: {
        hint: 'Nhân viên thu ngân: truy cập POS bán hàng, tạo & xử lý đơn hàng, thực hiện thanh toán hóa đơn.'
    }
};

if (tabs) {
    tabs.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const role = tab.dataset.role;
            tabs.dataset.active = role;
            tabs.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t === tab));

            if (roleConfigs[role] && hint) {
                hint.textContent = roleConfigs[role].hint;
            }
        });
    });
}

// ---------- Show / hide password ----------
const toggleBtn = document.getElementById('togglePassword');
if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
        const show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        toggleBtn.classList.toggle('is-visible', show);
        toggleBtn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    });
}

// ---------- Submit ----------
const form = document.getElementById('loginForm');
const errorEl = document.getElementById('formError');

function showError(message, input) {
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
    }
    if (form) {
        form.querySelectorAll('.input-wrap').forEach(w => w.classList.remove('has-error'));
    }
    if (input) {
        input.closest('.input-wrap')?.classList.add('has-error');
        input.focus();
    }
}

[usernameInput, passwordInput].forEach(input => {
    if (input) {
        input.addEventListener('input', () => {
            input.closest('.input-wrap')?.classList.remove('has-error');
            if (errorEl) errorEl.hidden = true;
        });
    }
});

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username) return showError('Vui lòng nhập tên đăng nhập.', usernameInput);
        if (!password) return showError('Vui lòng nhập mật khẩu.', passwordInput);

        const role = tabs ? (tabs.dataset.active || 'owner') : 'owner';
        const remember = document.getElementById('remember')?.checked;

        const API_BASE = (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '')
            ? 'http://localhost:8080/api/v1'
            : ((typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? `${window.location.origin}/api/v1` : 'http://localhost:8080/api/v1');

        try {
            const res = await window.API.fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const data = await res.json();
                let resolvedBranchId = data.branchId || '';
                let resolvedBranchName = data.branchName || '';

                window.API.clearToken();
                const storage = remember ? localStorage : sessionStorage;
                const userRole = data.role ? data.role.replace('ROLE_', '').toLowerCase() : role;
                [sessionStorage, storage].forEach(s => {
                    s.setItem('cp_token', data.accessToken || data.token);
                    s.setItem('cp_role', userRole);
                    s.setItem('cp_user', data.fullName || data.username || username);
                    s.setItem('cp_branch', resolvedBranchName);
                    s.setItem('cp_branch_id', resolvedBranchId);
                });

                if (userRole === 'cashier') {
                    window.location.href = '/pos/index.html';
                } else if (userRole === 'manager') {
                    window.location.href = '../branch/dashboard.html';
                } else {
                    window.location.href = '../owner/dashboard.html';
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                showError(errData.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
            }
        } catch (err) {
            showError('Không thể kết nối đến máy chủ Backend.');
        }
    });
}
