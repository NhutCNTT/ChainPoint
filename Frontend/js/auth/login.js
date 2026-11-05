// ChainPoint — Login page logic
// Used by: pages/auth/login.html

const tabs = document.querySelector('.tabs');
const hint = document.querySelector('#roleHint span');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

const roleConfigs = {
    owner: {
        hint: 'Quản lý toàn bộ chuỗi nhà hàng, tạo chi nhánh, xem doanh thu tổng và phân quyền toàn hệ thống.',
        defaultUser: 'owner'
    },
    manager: {
        hint: 'Quản lý chi nhánh được phân công: cấu hình bàn, thực đơn, đơn hàng, POS và nhân sự chi nhánh.',
        defaultUser: 'manager_q1'
    },
    cashier: {
        hint: 'Nhân viên thu ngân: truy cập POS bán hàng, tạo & xử lý đơn hàng, thực hiện thanh toán hóa đơn.',
        defaultUser: 'cashier_q1'
    }
};

tabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const role = tab.dataset.role;
        tabs.dataset.active = role;
        tabs.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t === tab));
        
        if (roleConfigs[role]) {
            hint.textContent = roleConfigs[role].hint;
            if (!usernameInput.value || Object.values(roleConfigs).some(c => c.defaultUser === usernameInput.value)) {
                usernameInput.value = roleConfigs[role].defaultUser;
            }
        }
    });
});

// ---------- Show / hide password ----------
const toggleBtn = document.getElementById('togglePassword');
toggleBtn.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    toggleBtn.classList.toggle('is-visible', show);
    toggleBtn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
});

// ---------- Submit ----------
const form = document.getElementById('loginForm');
const errorEl = document.getElementById('formError');

function showError(message, input) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    form.querySelectorAll('.input-wrap').forEach(w => w.classList.remove('has-error'));
    if (input) {
        input.closest('.input-wrap').classList.add('has-error');
        input.focus();
    }
}

[usernameInput, passwordInput].forEach(input => {
    input.addEventListener('input', () => {
        input.closest('.input-wrap').classList.remove('has-error');
        errorEl.hidden = true;
    });
});

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username) return showError('Vui lòng nhập tên đăng nhập.', usernameInput);
    if (!password) return showError('Vui lòng nhập mật khẩu.', passwordInput);

    const role = tabs.dataset.active || 'owner';
    const remember = document.getElementById('remember').checked;

    // Chi nhánh mặc định theo vai trò (khi backend chưa gắn API thật)
    let branch = 'Tất cả chi nhánh';
    if (role === 'manager') branch = 'Chi nhánh Quận 1';
    if (role === 'cashier') branch = 'Chi nhánh Quận 1';

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('cp_role', role);
    storage.setItem('cp_user', username);
    storage.setItem('cp_branch', branch);

    // Chuyển tới trang chủ theo đúng vai trò:
    // - owner & manager -> trang Dashboard quản trị
    // - cashier -> trực tiếp vào trang POS bán hàng
    if (role === 'cashier') {
        window.location.href = '../../pos/index.html';
    } else {
        window.location.href = '../admin/dashboard.html';
    }
});
