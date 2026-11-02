// ChainPoint — Login page logic
// Used by: auth/login.html

const tabs = document.querySelector('.tabs');
const hint = document.querySelector('#roleHint span');
const hints = {
    owner: 'Quản lý chi nhánh, nhân viên, thực đơn và điểm thưởng khách hàng trên toàn hệ thống.',
    employee: 'Truy cập máy bán hàng (POS) tại chi nhánh, xử lý đơn hàng và tích điểm cho khách.'
};

tabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const role = tab.dataset.role;
        tabs.dataset.active = role;
        tabs.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t === tab));
        hint.textContent = hints[role];
    });
});

// ---------- Show / hide password ----------
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('togglePassword');

toggleBtn.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    toggleBtn.classList.toggle('is-visible', show);
    toggleBtn.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
});

// ---------- Submit ----------
const form = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
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

    const role = tabs.dataset.active;
    const remember = document.getElementById('remember').checked;

    // TODO: gọi API xác thực thật, ví dụ:
    // fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ username, password, role }) })
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('cp_role', role);
    storage.setItem('cp_user', username);

    // Chuyển tới trang chủ theo vai trò
    window.location.href = role === 'employee'
        ? '../employee/pos.html'
        : '../admin/dashboard.html';
});
