// ChainPoint — Quản lý nhân sự & phân quyền (Chỉ gồm Quản lý và Thu ngân gắn với chi nhánh)
// Used by: pages/admin/staff.html

(function () {
    const STORAGE_KEY = 'cp_staff_list';

    const BRANCHES = [
        'Chi nhánh Quận 1',
        'Chi nhánh Thảo Điền',
        'Chi nhánh Hoàn Kiếm'
    ];

    // Dữ liệu nhân sự mẫu ban đầu: Chỉ có Manager và Cashier gắn với từng chi nhánh
    const DEFAULT_STAFF = [
        {
            id: 'st_01',
            name: 'Nguyễn Văn Nam',
            username: 'manager_q1',
            role: 'manager',
            branch: 'Chi nhánh Quận 1',
            phone: '0901 234 567',
            email: 'nam.nv@chainpoint.io',
            status: 'active',
            joinedAt: '15/01/2026'
        },
        {
            id: 'st_02',
            name: 'Trần Thị Thu Thảo',
            username: 'cashier_q1',
            role: 'cashier',
            branch: 'Chi nhánh Quận 1',
            phone: '0912 345 678',
            email: 'thao.ttt@chainpoint.io',
            status: 'active',
            joinedAt: '02/03/2026'
        },
        {
            id: 'st_03',
            name: 'Lê Hoàng Long',
            username: 'cashier_q1_02',
            role: 'cashier',
            branch: 'Chi nhánh Quận 1',
            phone: '0933 112 233',
            email: 'long.lh@chainpoint.io',
            status: 'active',
            joinedAt: '12/04/2026'
        },
        {
            id: 'st_04',
            name: 'Phạm Minh Đức',
            username: 'manager_td',
            role: 'manager',
            branch: 'Chi nhánh Thảo Điền',
            phone: '0944 556 677',
            email: 'duc.pm@chainpoint.io',
            status: 'active',
            joinedAt: '10/02/2026'
        },
        {
            id: 'st_05',
            name: 'Vũ Ngọc Hân',
            username: 'cashier_td',
            role: 'cashier',
            branch: 'Chi nhánh Thảo Điền',
            phone: '0988 776 655',
            email: 'han.vn@chainpoint.io',
            status: 'active',
            joinedAt: '18/05/2026'
        },
        {
            id: 'st_06',
            name: 'Hoàng Quốc Bảo',
            username: 'manager_hk',
            role: 'manager',
            branch: 'Chi nhánh Hoàn Kiếm',
            phone: '0977 443 322',
            email: 'bao.hq@chainpoint.io',
            status: 'active',
            joinedAt: '22/03/2026'
        },
        {
            id: 'st_07',
            name: 'Đặng Mai Phương',
            username: 'cashier_hk',
            role: 'cashier',
            branch: 'Chi nhánh Hoàn Kiếm',
            phone: '0966 221 100',
            email: 'phuong.dm@chainpoint.io',
            status: 'active',
            joinedAt: '05/06/2026'
        }
    ];

    function loadStaff() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error(e);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STAFF));
        return DEFAULT_STAFF;
    }

    function saveStaff(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    // Role của người đăng nhập hiện tại
    const getStorage = k => sessionStorage.getItem(k) || localStorage.getItem(k);
    const currentUserRole = getStorage('cp_role') || 'owner';
    const currentUserBranch = getStorage('cp_branch') || 'Chi nhánh Quận 1';

    let staffList = loadStaff();
    let currentRoleFilter = 'all';
    let currentBranchFilter = currentUserRole === 'manager' ? currentUserBranch : 'all';
    let currentSearch = '';

    // DOM Elements
    const staffTableBody = document.getElementById('staffTableBody');
    const branchFilterSelect = document.getElementById('branchFilterSelect');
    const roleFilterTabs = document.getElementById('roleFilterTabs');
    const searchInput = document.getElementById('staffSearchInput');
    const addStaffBtn = document.getElementById('addStaffBtn');
    const staffModal = document.getElementById('staffModal');
    const staffForm = document.getElementById('staffForm');
    const staffModalTitle = document.getElementById('staffModalTitle');
    const editingStaffId = document.getElementById('editingStaffId');

    // Form inputs
    const formStaffName = document.getElementById('formStaffName');
    const formStaffUsername = document.getElementById('formStaffUsername');
    const formStaffPassword = document.getElementById('formStaffPassword');
    const formStaffPhone = document.getElementById('formStaffPhone');
    const formStaffEmail = document.getElementById('formStaffEmail');
    const formStaffRole = document.getElementById('formStaffRole');
    const formStaffBranch = document.getElementById('formStaffBranch');
    const formStaffStatus = document.getElementById('formStaffStatus');
    const branchNotice = document.getElementById('branchNotice');

    // Stats
    const statTotal = document.getElementById('statTotalStaff');
    const statManagers = document.getElementById('statTotalManagers');
    const statCashiers = document.getElementById('statTotalCashiers');
    const statBranches = document.getElementById('statTotalBranches');

    function initBranchFilter() {
        if (!branchFilterSelect) return;
        if (currentUserRole === 'manager') {
            // Manager chỉ xem chi nhánh mình
            branchFilterSelect.innerHTML = `<option value="${currentUserBranch}">${currentUserBranch}</option>`;
            branchFilterSelect.disabled = true;
            if (branchNotice) {
                branchNotice.textContent = `(Quản lý chỉ quản lý nhân viên thuộc: ${currentUserBranch})`;
                branchNotice.hidden = false;
            }
        } else {
            // Owner quản lý toàn hệ thống
            branchFilterSelect.innerHTML = `
                <option value="all">Tất cả chi nhánh (${BRANCHES.length})</option>
                ${BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('')}
            `;
            branchFilterSelect.addEventListener('change', (e) => {
                currentBranchFilter = e.target.value;
                render();
            });
        }
    }

    function initFormBranchSelect() {
        if (!formStaffBranch) return;
        if (currentUserRole === 'manager') {
            formStaffBranch.innerHTML = `<option value="${currentUserBranch}">${currentUserBranch}</option>`;
            formStaffBranch.disabled = true;
        } else {
            formStaffBranch.innerHTML = BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('');
            formStaffBranch.disabled = false;
        }
    }

    function initRoleFilterTabs() {
        if (!roleFilterTabs) return;
        roleFilterTabs.querySelectorAll('.filter-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                roleFilterTabs.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentRoleFilter = btn.dataset.role;
                render();
            });
        });
    }

    function filterStaff() {
        return staffList.filter(s => {
            // Lọc theo quyền Manager
            if (currentUserRole === 'manager' && s.branch !== currentUserBranch) {
                return false;
            }
            // Lọc theo chi nhánh được chọn (nếu là Owner)
            if (currentBranchFilter !== 'all' && s.branch !== currentBranchFilter) {
                return false;
            }
            // Lọc theo vai trò (all | manager | cashier)
            if (currentRoleFilter !== 'all' && s.role !== currentRoleFilter) {
                return false;
            }
            // Lọc theo từ khóa tìm kiếm
            const q = currentSearch.toLowerCase().trim();
            if (q) {
                const matchName = s.name.toLowerCase().includes(q);
                const matchUser = s.username.toLowerCase().includes(q);
                const matchPhone = s.phone && s.phone.includes(q);
                return matchName || matchUser || matchPhone;
            }
            return true;
        });
    }

    function updateStats() {
        const visibleList = currentUserRole === 'manager'
            ? staffList.filter(s => s.branch === currentUserBranch)
            : staffList;

        if (statTotal) statTotal.textContent = visibleList.length;
        if (statManagers) statManagers.textContent = visibleList.filter(s => s.role === 'manager').length;
        if (statCashiers) statCashiers.textContent = visibleList.filter(s => s.role === 'cashier').length;
        if (statBranches) {
            const branchSet = new Set(visibleList.map(s => s.branch));
            statBranches.textContent = branchSet.size;
        }
    }

    function render() {
        updateStats();
        const filtered = filterStaff();

        if (!staffTableBody) return;
        if (filtered.length === 0) {
            staffTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 48px 20px; color: var(--muted);">
                        <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
                        <div style="font-size: 15px; font-weight: 700; color: var(--text);">Không tìm thấy nhân viên nào</div>
                        <div style="font-size: 13px; margin-top: 4px;">Thử thay đổi bộ lọc tìm kiếm hoặc tạo thêm nhân viên mới.</div>
                    </td>
                </tr>
            `;
            return;
        }

        staffTableBody.innerHTML = filtered.map(s => {
            const isManager = s.role === 'manager';
            const isActive = s.status === 'active';
            const roleBadge = isManager
                ? `<span class="badge badge-primary">👑 Quản lý</span>`
                : `<span class="badge badge-purple">💳 Thu ngân</span>`;

            const statusBadge = isActive
                ? `<span class="badge badge-success">● Đang làm việc</span>`
                : `<span class="badge badge-neutral">⏸ Tạm khóa</span>`;

            return `
                <tr data-id="${s.id}">
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="user-chip" style="box-shadow: none; padding: 0;">
                                <div class="avatar" style="background: ${isManager ? '#eef4ff' : '#f5f0ff'}; color: ${isManager ? '#2f6bff' : '#7c3aed'}; font-size: 13px; font-weight: 800;">
                                    ${s.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div>
                                <strong style="display: block; font-size: 14px; color: var(--text);">${s.name}</strong>
                                <small style="color: var(--muted); font-size: 12px;">@${s.username}</small>
                            </div>
                        </div>
                    </td>
                    <td>${roleBadge}</td>
                    <td>
                        <span style="font-weight: 600; color: #1e3a8a; font-size: 13.5px;">📍 ${s.branch}</span>
                    </td>
                    <td>
                        <div style="font-size: 13px;">${s.phone || '—'}</div>
                        <small style="color: var(--muted); font-size: 12px;">${s.email || ''}</small>
                    </td>
                    <td>${statusBadge}</td>
                    <td style="font-size: 12.5px; color: var(--muted);">${s.joinedAt || '—'}</td>
                    <td style="text-align: right;">
                        <button class="btn-secondary btn-edit-staff" data-id="${s.id}" style="padding: 6px 12px; font-size: 12px; margin-right: 6px;" type="button">
                            Sửa
                        </button>
                        <button class="btn-secondary btn-toggle-staff" data-id="${s.id}" style="padding: 6px 12px; font-size: 12px; margin-right: 6px;" type="button">
                            ${isActive ? 'Khóa' : 'Mở khóa'}
                        </button>
                        <button class="btn-danger-outline btn-delete-staff" data-id="${s.id}" style="padding: 6px 12px; font-size: 12px;" type="button">
                            Xóa
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        bindActions();
    }

    function bindActions() {
        // Edit staff
        document.querySelectorAll('.btn-edit-staff').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                openEditModal(id);
            });
        });

        // Toggle active/inactive
        document.querySelectorAll('.btn-toggle-staff').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const staff = staffList.find(s => s.id === id);
                if (!staff) return;

                const willLock = staff.status === 'active';
                if (confirm(`Bạn có chắc muốn ${willLock ? 'TẠM KHÓA' : 'MỞ KHÓA'} tài khoản của "${staff.name}"?`)) {
                    staff.status = willLock ? 'disabled' : 'active';
                    saveStaff(staffList);
                    render();
                }
            });
        });

        // Delete staff
        document.querySelectorAll('.btn-delete-staff').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const staff = staffList.find(s => s.id === id);
                if (!staff) return;

                if (confirm(`Xác nhận XÓA VĨNH VIỄN nhân viên "${staff.name}" khỏi hệ thống?`)) {
                    staffList = staffList.filter(s => s.id !== id);
                    saveStaff(staffList);
                    render();
                }
            });
        });
    }

    function openAddModal() {
        editingStaffId.value = '';
        staffModalTitle.textContent = 'Thêm nhân viên mới';
        formStaffName.value = '';
        formStaffUsername.value = '';
        formStaffUsername.disabled = false;
        formStaffPassword.value = '123456';
        formStaffPhone.value = '';
        formStaffEmail.value = '';
        formStaffRole.value = 'cashier'; // Mặc định thu ngân
        formStaffStatus.value = 'active';

        if (currentUserRole === 'manager') {
            formStaffBranch.value = currentUserBranch;
            formStaffBranch.disabled = true;
        } else {
            formStaffBranch.value = currentBranchFilter !== 'all' ? currentBranchFilter : BRANCHES[0];
            formStaffBranch.disabled = false;
        }

        staffModal.classList.add('is-open');
        formStaffName.focus();
    }

    function openEditModal(id) {
        const staff = staffList.find(s => s.id === id);
        if (!staff) return;

        editingStaffId.value = staff.id;
        staffModalTitle.textContent = `Chỉnh sửa nhân viên: ${staff.name}`;
        formStaffName.value = staff.name;
        formStaffUsername.value = staff.username;
        formStaffUsername.disabled = true; // Không cho đổi username
        formStaffPassword.value = ''; // Để trống nếu không đổi
        formStaffPhone.value = staff.phone || '';
        formStaffEmail.value = staff.email || '';
        formStaffRole.value = staff.role;
        formStaffStatus.value = staff.status;

        if (currentUserRole === 'manager') {
            formStaffBranch.value = staff.branch;
            formStaffBranch.disabled = true;
        } else {
            formStaffBranch.value = staff.branch;
            formStaffBranch.disabled = false;
        }

        staffModal.classList.add('is-open');
    }

    function closeModal() {
        staffModal.classList.remove('is-open');
    }

    // Form submit
    if (staffForm) {
        staffForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const isEdit = !!editingStaffId.value;
            const name = formStaffName.value.trim();
            const username = formStaffUsername.value.trim().toLowerCase();
            const password = formStaffPassword.value;
            const phone = formStaffPhone.value.trim();
            const email = formStaffEmail.value.trim();
            const role = formStaffRole.value; // CHỈ CÓ 'manager' hoặc 'cashier'
            const branch = currentUserRole === 'manager' ? currentUserBranch : formStaffBranch.value;
            const status = formStaffStatus.value;

            if (!name) return alert('Vui lòng nhập họ và tên nhân viên.');
            if (!username) return alert('Vui lòng nhập tên đăng nhập.');

            if (!isEdit) {
                // Kiểm tra trùng username
                const dup = staffList.find(s => s.username.toLowerCase() === username);
                if (dup) return alert(`Tên đăng nhập "${username}" đã được sử dụng. Vui lòng chọn tên khác.`);

                const now = new Date();
                const pad = n => String(n).padStart(2, '0');
                const joinedAt = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

                staffList.unshift({
                    id: 'st_' + Date.now().toString().slice(-6),
                    name,
                    username,
                    password: password || '123456',
                    role,
                    branch,
                    phone,
                    email,
                    status,
                    joinedAt
                });
            } else {
                const staff = staffList.find(s => s.id === editingStaffId.value);
                if (staff) {
                    staff.name = name;
                    staff.phone = phone;
                    staff.email = email;
                    staff.role = role;
                    staff.branch = branch;
                    staff.status = status;
                    if (password) staff.password = password;
                }
            }

            saveStaff(staffList);
            closeModal();
            render();
        });
    }

    // Modal close triggers
    const closeStaffModalBtn = document.getElementById('closeStaffModalBtn');
    const cancelStaffModalBtn = document.getElementById('cancelStaffModalBtn');
    if (closeStaffModalBtn) closeStaffModalBtn.addEventListener('click', closeModal);
    if (cancelStaffModalBtn) cancelStaffModalBtn.addEventListener('click', closeModal);
    if (staffModal) {
        staffModal.addEventListener('click', (e) => {
            if (e.target === staffModal) closeModal();
        });
    }

    if (addStaffBtn) addStaffBtn.addEventListener('click', openAddModal);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            render();
        });
    }

    // Initialize
    initBranchFilter();
    initFormBranchSelect();
    initRoleFilterTabs();
    render();
})();

