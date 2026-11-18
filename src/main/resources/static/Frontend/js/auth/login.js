// ChainPoint — Unified authentication page logic
// Supports Owner, Manager and Cashier roles against the live backend API.

(function () {
    const ROLE_ALIASES = {
        owner: 'owner',
        manager: 'manager',
        cashier: 'cashier',
        employee: 'cashier',
        pos: 'cashier',
        branch: 'manager'
    };

    const ROLE_META = {
        owner: {
            heroTitle: 'Kiểm soát toàn chuỗi, <span>tối ưu vận hành.</span>',
            heroText: 'Báo cáo doanh thu đa chi nhánh, so sánh hiệu quả kinh doanh và quản trị phân quyền toàn hệ thống.',
            hint: 'Quản lý toàn bộ chuỗi nhà hàng, tạo chi nhánh và theo dõi doanh thu tổng.',
            cardTitle: 'Đăng nhập Chủ chuỗi',
            cardSubtitle: 'Quản trị điều hành toàn chuỗi nhà hàng',
            submitLabel: 'Đăng nhập Chủ chuỗi'
        },
        manager: {
            heroTitle: 'Vận hành tại quầy, <span>phục vụ nhanh chóng.</span>',
            heroText: 'Quản lý bàn ăn, thực đơn, đơn hàng và nhân sự tại chi nhánh được phân công.',
            hint: 'Quản lý chi nhánh được phân công: bàn ăn, thực đơn, đơn hàng và nhân sự.',
            cardTitle: 'Đăng nhập Quản lý',
            cardSubtitle: 'Điều hành chi nhánh được phân công',
            submitLabel: 'Đăng nhập Quản lý'
        },
        cashier: {
            heroTitle: 'Vận hành tại quầy, <span>phục vụ nhanh chóng.</span>',
            heroText: 'Bán hàng tại máy POS, xử lý đơn hàng, thanh toán hóa đơn và tích điểm hội viên.',
            hint: 'Thu ngân: truy cập POS bán hàng, xử lý đơn hàng và thanh toán hóa đơn.',
            cardTitle: 'Đăng nhập Thu ngân',
            cardSubtitle: 'Vào màn hình POS để bắt đầu bán hàng',
            submitLabel: 'Vào màn hình POS'
        }
    };

    const AUTH_KEYS = [
        'cp_token',
        'cp_token_type',
        'cp_user',
        'cp_role',
        'cp_branch',
        'cp_branch_id'
    ];

    const isLiveServer = typeof window !== 'undefined'
        && window.location.port
        && window.location.port !== '8080'
        && window.location.port !== '';
    const API_BASE = isLiveServer
        ? 'http://localhost:8080/api/v1'
        : ((window.location.origin && window.location.origin !== 'null')
            ? `${window.location.origin}/api/v1`
            : 'http://localhost:8080/api/v1');

    const tabs = document.getElementById('loginTabs');
    const branchField = document.getElementById('branchField');
    const branchSelect = document.getElementById('branchSelect');
    const form = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberInput = document.getElementById('remember');
    const errorEl = document.getElementById('formError');
    const errorTextEl = document.getElementById('formErrorText');
    const submitButton = document.getElementById('loginSubmitBtn');
    const submitText = document.getElementById('submitBtnText');
    const toggleButton = document.getElementById('togglePassword');
    const heroTitle = document.getElementById('heroTitle');
    const heroText = document.getElementById('heroText');
    const cardTitle = document.getElementById('cardTitle');
    const cardSubtitle = document.getElementById('cardSubtitle');
    const roleHintText = document.querySelector('#roleHint span');

    let currentRole = 'owner';
    let isSubmitting = false;

    const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    function normalizeRole(value, fallback) {
        const normalized = String(value || '').trim().toLowerCase().replace(/^role_/, '');
        if (ROLE_ALIASES[normalized]) {
            return ROLE_ALIASES[normalized];
        }
        return fallback === undefined ? 'owner' : fallback;
    }

    function getRoleFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const queryRole = params.get('role');
        if (queryRole) return normalizeRole(queryRole, 'owner');

        const hashRole = window.location.hash.replace('#', '');
        if (hashRole) return normalizeRole(hashRole, 'owner');

        return 'owner';
    }

    function clearError() {
        if (errorEl) errorEl.hidden = true;
        if (errorTextEl) errorTextEl.textContent = '';
        if (form) {
            form.querySelectorAll('.input-wrap.has-error').forEach(wrapper => wrapper.classList.remove('has-error'));
        }
    }

    function showError(message, input) {
        if (errorEl) errorEl.hidden = false;
        if (errorTextEl) errorTextEl.textContent = message;
        if (form) {
            form.querySelectorAll('.input-wrap.has-error').forEach(wrapper => wrapper.classList.remove('has-error'));
        }
        if (input) {
            const wrapper = input.closest('.input-wrap');
            if (wrapper) wrapper.classList.add('has-error');
            input.focus();
        }
    }

    function setLoading(loading) {
        isSubmitting = loading;
        if (submitButton) {
            submitButton.disabled = loading;
            submitButton.classList.toggle('is-loading', loading);
            submitButton.setAttribute('aria-busy', String(loading));
        }
    }

    function updateUrlRole(role) {
        try {
            const url = new URL(window.location.href);
            if (url.protocol === 'file:') return;
            url.searchParams.set('role', role);
            url.hash = '';
            window.history.replaceState({}, '', url);
        } catch (ignored) {
            // URL updates are optional.
        }
    }

    function selectRole(role, options) {
        const normalized = normalizeRole(role);
        const meta = ROLE_META[normalized];
        currentRole = normalized;

        if (tabs) {
            tabs.dataset.active = normalized;
            tabs.querySelectorAll('.tab').forEach(tab => {
                const selected = tab.dataset.role === normalized;
                tab.setAttribute('aria-selected', String(selected));
                tab.tabIndex = selected ? 0 : -1;
            });
        }

        if (branchField) branchField.hidden = normalized === 'owner';
        if (heroTitle) heroTitle.innerHTML = meta.heroTitle;
        if (heroText) heroText.textContent = meta.heroText;
        if (roleHintText) roleHintText.textContent = meta.hint;
        if (cardTitle) cardTitle.textContent = meta.cardTitle;
        if (cardSubtitle) cardSubtitle.textContent = meta.cardSubtitle;
        if (submitText) submitText.textContent = meta.submitLabel;

        clearError();
        updateUrlRole(normalized);

        if (options && options.focus && tabs) {
            const activeTab = tabs.querySelector(`.tab[data-role="${normalized}"]`);
            if (activeTab) activeTab.focus();
        }
    }

    async function loadBranches() {
        if (!branchSelect) return;

        branchSelect.disabled = true;
        branchSelect.innerHTML = '<option value="">Đang tải danh sách chi nhánh...</option>';

        try {
            const response = await fetch(`${API_BASE}/auth/branches`, {
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Không thể tải chi nhánh (${response.status})`);
            }

            const list = await response.json();
            if (!Array.isArray(list) || list.length === 0) {
                branchSelect.innerHTML = '<option value="">Chưa có chi nhánh khả dụng</option>';
                return;
            }

            branchSelect.innerHTML = list.map(branch => {
                const id = branch.id != null ? branch.id : (branch.code || '');
                const name = branch.name || branch.branchName || '';
                const code = branch.code ? ` (${branch.code})` : '';
                return `<option value="${escapeHtml(id)}" data-name="${escapeHtml(name)}">${escapeHtml(name)}${escapeHtml(code)}</option>`;
            }).join('');

            branchSelect.disabled = false;

            const savedBranchId = sessionStorage.getItem('cp_branch_id') || localStorage.getItem('cp_branch_id');
            if (savedBranchId && Array.from(branchSelect.options).some(option => option.value === String(savedBranchId))) {
                branchSelect.value = String(savedBranchId);
            } else {
                branchSelect.selectedIndex = 0;
            }
        } catch (error) {
            branchSelect.innerHTML = '<option value="">Không thể tải danh sách chi nhánh</option>';
            console.error('[Auth] Failed to load branches:', error);
        }
    }

    function getSelectedBranch() {
        if (!branchSelect || !branchSelect.selectedOptions || branchSelect.selectedOptions.length === 0) {
            return { id: '', name: '' };
        }

        const option = branchSelect.selectedOptions[0];
        const name = option.dataset.name || option.textContent.trim();
        return { id: option.value || '', name };
    }

    function clearAuthStorage() {
        [sessionStorage, localStorage].forEach(storage => {
            AUTH_KEYS.forEach(key => storage.removeItem(key));
        });
    }

    function persistAuth(data, role, remember, username, fallbackBranch) {
        clearAuthStorage();

        const values = {
            cp_token: data.accessToken || data.token || '',
            cp_token_type: data.tokenType || 'Bearer',
            cp_user: data.fullName || data.username || username,
            cp_role: role,
            cp_branch_id: data.branchId != null ? data.branchId : fallbackBranch.id,
            cp_branch: data.branchName || fallbackBranch.name || ''
        };

        const storages = remember ? [sessionStorage, localStorage] : [sessionStorage];
        storages.forEach(storage => {
            Object.entries(values).forEach(([key, value]) => {
                storage.setItem(key, value == null ? '' : String(value));
            });
        });
    }

    function getUserFriendlyError(status, data) {
        const rawMessage = data && typeof data.message === 'string' ? data.message : '';
        const message = rawMessage.toLowerCase();

        if (status === 401 || status === 403
            || message.includes('bad credentials')
            || message.includes('invalid credentials')) {
            return 'Tên đăng nhập hoặc mật khẩu không chính xác.';
        }

        if (message.includes('disabled')) {
            return 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.';
        }

        if (message.includes('locked')) {
            return 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.';
        }

        if (message.includes('username is required') || message.includes('password is required')) {
            return 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.';
        }

        if (status >= 500) {
            if (rawMessage && !/bad credentials|internal server error|unexpected/i.test(rawMessage)) {
                return rawMessage;
            }
            return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
        }

        return rawMessage || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
    }

    function redirectForRole(role) {
        if (role === 'cashier') {
            window.location.replace('../../pos/index.html');
            return;
        }

        window.location.replace('../admin/dashboard.html');
    }

    if (tabs) {
        tabs.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => selectRole(tab.dataset.role));
        });

        tabs.addEventListener('keydown', event => {
            const roles = ['owner', 'manager', 'cashier'];
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

            event.preventDefault();
            let index = roles.indexOf(currentRole);

            if (event.key === 'ArrowRight') index = (index + 1) % roles.length;
            if (event.key === 'ArrowLeft') index = (index - 1 + roles.length) % roles.length;
            if (event.key === 'Home') index = 0;
            if (event.key === 'End') index = roles.length - 1;

            selectRole(roles[index], { focus: true });
        });
    }

    if (toggleButton && passwordInput) {
        toggleButton.addEventListener('click', () => {
            const showPassword = passwordInput.type === 'password';
            passwordInput.type = showPassword ? 'text' : 'password';
            toggleButton.classList.toggle('is-visible', showPassword);
            toggleButton.setAttribute('aria-label', showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
        });
    }

    [usernameInput, passwordInput].forEach(input => {
        if (!input) return;
        input.addEventListener('input', () => {
            const wrapper = input.closest('.input-wrap');
            if (wrapper) wrapper.classList.remove('has-error');
            if (errorEl) errorEl.hidden = true;
        });
    });

    if (branchSelect) {
        branchSelect.addEventListener('change', () => {
            if (errorEl) errorEl.hidden = true;
        });
    }

    if (form) {
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (isSubmitting) return;

            const username = usernameInput ? usernameInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!username) {
                showError('Vui lòng nhập tên đăng nhập.', usernameInput);
                return;
            }

            if (!password) {
                showError('Vui lòng nhập mật khẩu.', passwordInput);
                return;
            }

            const remember = Boolean(rememberInput && rememberInput.checked);
            const fallbackBranch = getSelectedBranch();

            clearError();
            setLoading(true);

            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json().catch(() => null);

                if (!response.ok) {
                    showError(getUserFriendlyError(response.status, data));
                    return;
                }

                if (!data || !(data.accessToken || data.token)) {
                    showError('Phản hồi đăng nhập không hợp lệ. Vui lòng thử lại.');
                    return;
                }

                const role = normalizeRole(data.role, currentRole);
                persistAuth(data, role, remember, username, fallbackBranch);
                redirectForRole(role);
            } catch (error) {
                console.error('[Auth] Login request failed:', error);
                showError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
            } finally {
                setLoading(false);
            }
        });
    }

    selectRole(getRoleFromUrl());
    loadBranches();
})();
