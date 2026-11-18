// ChainPoint — Quản lý nhân sự & phân quyền (Chỉ gồm Quản lý và Thu ngân gắn với chi nhánh)
// Sử dụng API Backend MySQL thay thế hoàn toàn localStorage

(async function () {
    await window.CP.ready;
    let branches = [];
    let staffList = [];
    let currentRoleFilter = new URLSearchParams(location.search).get('role') || 'all';
    let currentBranchFilter = 'all';
    let currentSearch = '';

    const getStorage = k => sessionStorage.getItem(k) || localStorage.getItem(k);
    const currentUserRole = getStorage('cp_role') || 'owner';
    const currentUserBranch = getStorage('cp_branch') || '';
    const currentBranchId = getStorage('cp_branch_id') || null;

    if (currentUserRole === 'manager') {
        currentBranchFilter = currentUserBranch;
    }

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
    const assignments = document.createElement('select');
    assignments.id = 'managerBranchAssignments'; assignments.multiple = true;
    const assignmentLabel = document.createElement('label');
    assignmentLabel.textContent = 'Chi nhánh bổ sung cho Quản lý (Ctrl/Cmd để chọn nhiều)';
    assignmentLabel.appendChild(assignments);
    formStaffBranch?.parentElement.appendChild(assignmentLabel);

    // Stats
    const statTotal = document.getElementById('statTotalStaff');
    const statManagers = document.getElementById('statTotalManagers');
    const statCashiers = document.getElementById('statTotalCashiers');
    const statBranches = document.getElementById('statTotalBranches');

    async function loadData() {
        try {
            // 1. Tải danh sách chi nhánh
            if (window.API) {
                branches = await window.API.get('/branches');
            } else {
                const bRes = await fetch('http://localhost:8080/api/v1/branches');
                branches = await bRes.json();
            }
            initBranchOptions();

            // 2. Tải danh sách nhân sự
            const queryParams = [];
            if (currentUserRole === 'manager' && currentBranchId) {
                queryParams.push(`branchId=${currentBranchId}`);
            }
            const endpoint = '/staff' + (queryParams.length ? `?${queryParams.join('&')}` : '');
            
            if (window.API) {
                staffList = await window.API.get(endpoint);
            } else {
                const sRes = await fetch(`http://localhost:8080/api/v1${endpoint}`);
                staffList = await sRes.json();
            }
        } catch (e) {
            console.error('Không thể nạp dữ liệu nhân sự từ MySQL API:', e);
            staffList = [];
        }
        render();
    }

    function initBranchOptions() {
        assignments.replaceChildren();
        branches.forEach(branch => assignments.add(new Option(branch.name, branch.id)));
        if (formStaffBranch) {
            formStaffBranch.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
            if (currentBranchId) formStaffBranch.value = currentBranchId;
        }

        if (branchFilterSelect) {
            if (currentUserRole === 'manager') {
                branchFilterSelect.innerHTML = `<option value="${currentUserBranch}">${currentUserBranch}</option>`;
                branchFilterSelect.disabled = true;
                if (branchNotice) {
                    branchNotice.textContent = `(Quản lý chỉ quản lý nhân sự thuộc: ${currentUserBranch})`;
                    branchNotice.hidden = false;
                }
            } else {
                branchFilterSelect.innerHTML = `
                    <option value="all">Tất cả chi nhánh (${branches.length})</option>
                    ${branches.map(b => `<option value="${b.name}">${b.name}</option>`).join('')}
                `;
            }
        }
    }

    function updateStats() {
        const activeStaff = staffList.filter(s => s.status === 'active' && s.role !== 'ROLE_OWNER');
        if (statTotal) statTotal.textContent = activeStaff.length;
        if (statManagers) {
            statManagers.textContent = activeStaff.filter(s => (s.role || '').toUpperCase().includes('MANAGER')).length;
        }
        if (statCashiers) {
            statCashiers.textContent = activeStaff.filter(s => (s.role || '').toUpperCase().includes('CASHIER')).length;
        }
        if (statBranches) statBranches.textContent = branches.length;
    }

    function render() {
        updateStats();
        if (!staffTableBody) return;

        const filtered = staffList.filter(s => {
            if (s.role === 'ROLE_OWNER') return false;
            const roleMatch = currentRoleFilter === 'all' || (s.role && s.role.toUpperCase().includes(currentRoleFilter.toUpperCase()));
            const branchMatch = currentBranchFilter === 'all' || s.branchName === currentBranchFilter;
            const q = currentSearch.toLowerCase().trim();
            const searchMatch = !q ||
                (s.fullName && s.fullName.toLowerCase().includes(q)) ||
                (s.username && s.username.toLowerCase().includes(q)) ||
                (s.phone && s.phone.includes(q)) ||
                (s.email && s.email.toLowerCase().includes(q));

            return roleMatch && branchMatch && searchMatch;
        });

        if (filtered.length === 0) {
            staffTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div style="padding: 32px; text-align: center; color: var(--muted);">
                            <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
                            <div style="font-weight: 700; font-size: 15px;">Không tìm thấy nhân viên nào</div>
                            <p style="font-size: 13px; margin-top: 4px;">Thử đổi bộ lọc hoặc thêm tài khoản nhân viên mới vào cơ sở dữ liệu.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        staffTableBody.innerHTML = filtered.map(s => {
            const isManager = (s.role || '').toUpperCase().includes('MANAGER');
            const isActive = s.status === 'active';
            const roleBadge = isManager
                ? `<span class="badge badge-primary">Quản lý</span>`
                : `<span class="badge badge-success">Thu ngân</span>`;
            const statusBadge = isActive
                ? `<span class="badge badge-success">Đang làm</span>`
                : `<span class="badge badge-neutral">Tạm khóa</span>`;

            return `
                <tr>
                    <td>
                        <div style="font-weight: 700; color: var(--text);">${window.escapeHtml(s.fullName)}</div>
                        <div style="font-size: 12px; color: var(--muted);">${window.escapeHtml(s.email) || '—'}</div>
                    </td>
                    <td><code>${window.escapeHtml(s.username)}</code></td>
                    <td>${roleBadge}</td>
                    <td>📍 ${window.escapeHtml(s.branchName) || 'Toàn hệ thống'}</td>
                    <td>${window.escapeHtml(s.phone) || '—'}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="action-icon-btn btn-edit-staff" data-id="${s.id}" title="Chỉnh sửa">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="action-icon-btn btn-delete-staff" data-id="${s.id}" title="Xóa" style="color: var(--danger, #ef4444);">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        bindActions();
    }

    function bindActions() {
        document.querySelectorAll('.btn-edit-staff').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });

        document.querySelectorAll('.btn-delete-staff').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (confirm('Bạn có chắc muốn xóa nhân viên này khỏi cơ sở dữ liệu?')) {
                    try {
                        if (window.API) {
                            await window.API.delete(`/staff/${id}`);
                        } else {
                            await fetch(`http://localhost:8080/api/v1/staff/${id}`, { method: 'DELETE' });
                        }
                        await loadData();
                    } catch (err) {
                        alert('Lỗi xóa nhân viên: ' + err.message);
                    }
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
        formStaffPassword.value = '';
        formStaffPassword.required = true;
        formStaffPhone.value = '';
        formStaffEmail.value = '';
        formStaffRole.value = 'ROLE_CASHIER';
        if (new URLSearchParams(location.search).get('role') === 'manager') formStaffRole.value = 'ROLE_MANAGER';
        Array.from(assignments.options).forEach(option => option.selected = false);
        formStaffStatus.value = 'active';

        staffModal.classList.add('is-open');
        formStaffName.focus();
    }

    function openEditModal(id) {
        const staff = staffList.find(s => String(s.id) === String(id));
        if (!staff) return;

        editingStaffId.value = staff.id;
        staffModalTitle.textContent = `Chỉnh sửa nhân viên: ${staff.fullName}`;
        formStaffName.value = staff.fullName;
        formStaffUsername.value = staff.username;
        formStaffUsername.disabled = true;
        formStaffPassword.value = '';
        formStaffPassword.required = false;
        formStaffPhone.value = staff.phone || '';
        formStaffEmail.value = staff.email || '';
        formStaffRole.value = staff.role || 'ROLE_CASHIER';
        Array.from(assignments.options).forEach(option => option.selected = (staff.branchIds || []).map(String).includes(option.value));
        if (formStaffBranch && staff.branchId) formStaffBranch.value = staff.branchId;
        formStaffStatus.value = staff.status || 'active';

        staffModal.classList.add('is-open');
    }

    function closeModal() {
        staffModal.classList.remove('is-open');
    }

    if (staffForm) {
        staffForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = editingStaffId.value;
            const branchIdVal = formStaffBranch ? Number(formStaffBranch.value) : null;

            const payload = {
                username: formStaffUsername.value.trim().toLowerCase(),
                password: formStaffPassword.value || undefined,
                fullName: formStaffName.value.trim(),
                phone: formStaffPhone.value.trim(),
                email: formStaffEmail.value.trim(),
                role: formStaffRole.value,
                branchId: branchIdVal,
                branchIds: formStaffRole.value === 'ROLE_MANAGER' ? Array.from(assignments.selectedOptions, option => Number(option.value)) : [],
                status: formStaffStatus.value
            };

            if (!payload.fullName) return alert('Vui lòng nhập họ và tên nhân viên.');
            if (!payload.username) return alert('Vui lòng nhập tên đăng nhập.');

            try {
                if (id) {
                    if (window.API) {
                        await window.API.put(`/staff/${id}`, payload);
                    } else {
                        await fetch(`http://localhost:8080/api/v1/staff/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    }
                } else {
                    if (window.API) {
                        await window.API.post('/staff', payload);
                    } else {
                        await fetch('http://localhost:8080/api/v1/staff', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    }
                }
                closeModal();
                await loadData();
            } catch (err) {
                alert('Lỗi lưu nhân viên vào Database: ' + err.message);
            }
        });
    }

    const closeBtn = document.getElementById('closeStaffModalBtn');
    const cancelBtn = document.getElementById('cancelStaffModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
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

    if (branchFilterSelect) {
        branchFilterSelect.addEventListener('change', (e) => {
            currentBranchFilter = e.target.value;
            render();
        });
    }

    if (roleFilterTabs) {
        roleFilterTabs.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                roleFilterTabs.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t === tab));
                currentRoleFilter = tab.dataset.role || 'all';
                render();
            });
        });
    }

    loadData();
})();
