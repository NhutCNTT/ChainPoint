// ChainPoint — Quản lý Nhân sự Chi nhánh (Chỉ gồm Quản lý & Thu ngân)
// Used by: pages/branch/staff.html

(function () {
    const STORAGE_KEY = 'cp_staff_list';

    const DEFAULT_STAFF = [
        {
            id: 'st_01',
            name: 'Nguyễn Văn Nam',
            username: 'nam.nv',
            role: 'manager',
            branch: 'Chi nhánh Quận 1',
            phone: '0901 234 567',
            email: 'nam.nv@chainpoint.io',
            status: 'active',
            joinedAt: '15/01/2026',
            lastLogin: '02/11/2026 08:30'
        },
        {
            id: 'st_02',
            name: 'Trần Thị Thu Thảo',
            username: 'thao.ttt',
            role: 'cashier',
            branch: 'Chi nhánh Quận 1',
            phone: '0912 345 678',
            email: 'thao.ttt@chainpoint.io',
            status: 'active',
            joinedAt: '02/03/2026',
            lastLogin: '02/11/2026 11:15'
        },
        {
            id: 'st_03',
            name: 'Lê Hoàng Long',
            username: 'long.lh',
            role: 'cashier',
            branch: 'Chi nhánh Quận 1',
            phone: '0933 112 233',
            email: 'long.lh@chainpoint.io',
            status: 'active',
            joinedAt: '12/04/2026',
            lastLogin: '01/11/2026 21:00'
        },
        {
            id: 'st_04',
            name: 'Phạm Minh Đức',
            username: 'duc.pm',
            role: 'manager',
            branch: 'Chi nhánh Thảo Điền',
            phone: '0944 556 677',
            email: 'duc.pm@chainpoint.io',
            status: 'active',
            joinedAt: '10/02/2026',
            lastLogin: '02/11/2026 09:00'
        },
        {
            id: 'st_05',
            name: 'Vũ Ngọc Hân',
            username: 'han.vn',
            role: 'cashier',
            branch: 'Chi nhánh Thảo Điền',
            phone: '0988 776 655',
            email: 'han.vn@chainpoint.io',
            status: 'active',
            joinedAt: '18/05/2026',
            lastLogin: '02/11/2026 10:45'
        },
        {
            id: 'st_06',
            name: 'Hoàng Quốc Bảo',
            username: 'bao.hq',
            role: 'manager',
            branch: 'Chi nhánh Hoàn Kiếm',
            phone: '0977 443 322',
            email: 'bao.hq@chainpoint.io',
            status: 'active',
            joinedAt: '22/03/2026',
            lastLogin: '02/11/2026 08:00'
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

    const currentBranch = sessionStorage.getItem('cp_branch') || localStorage.getItem('cp_branch') || 'Chi nhánh Quận 1';
    let allStaff = loadStaff();
    let currentRoleFilter = 'all';
    let searchQuery = '';

    const tbody = document.getElementById('staffTableBody');
    const searchInput = document.getElementById('staffSearchInput');
    const filterTabs = document.getElementById('roleFilterTabs');
    const modal = document.getElementById('staffModal');
    const staffForm = document.getElementById('staffForm');
    const modalTitle = document.getElementById('staffModalTitle');
    const editingIdInput = document.getElementById('editingStaffId');

    function getBranchStaff() {
        return allStaff.filter(s => s.branch === currentBranch);
    }

    function updateStats() {
        const branchList = getBranchStaff();
        const total = branchList.length;
        const managers = branchList.filter(s => s.role === 'manager').length;
        const cashiers = branchList.filter(s => s.role === 'cashier').length;
        const active = branchList.filter(s => s.status === 'active').length;

        const statTotal = document.getElementById('statTotalStaff');
        const statMgr = document.getElementById('statTotalManagers');
        const statCash = document.getElementById('statTotalCashiers');
        const statAct = document.getElementById('statActiveStaff');

        if (statTotal) statTotal.textContent = total;
        if (statMgr) statMgr.textContent = managers;
        if (statCash) statCash.textContent = cashiers;
        if (statAct) statAct.textContent = active;
    }

    function renderStaff() {
        if (!tbody) return;
        const branchList = getBranchStaff();

        const filtered = branchList.filter(s => {
            const matchRole = currentRoleFilter === 'all' || s.role === currentRoleFilter;
            const matchSearch = !searchQuery ||
                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.phone.includes(searchQuery);
            return matchRole && matchSearch;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">
                        Chưa có nhân sự nào trong danh sách.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(s => {
            const isManager = s.role === 'manager';
            const isActive = s.status === 'active';
            const roleBadge = isManager
                ? `<span style="background:#eff6ff; color:#2563eb; font-weight:700; padding:4px 10px; border-radius:999px; font-size:12px;">👑 Quản lý chi nhánh</span>`
                : `<span style="background:#ecfdf5; color:#059669; font-weight:700; padding:4px 10px; border-radius:999px; font-size:12px;">💳 Thu ngân (POS)</span>`;

            const statusBadge = isActive
                ? `<span style="background:#ecfdf5; color:#059669; font-weight:700; padding:4px 10px; border-radius:999px; font-size:12px;">● Hoạt động</span>`
                : `<span style="background:#fee2e2; color:#dc2626; font-weight:700; padding:4px 10px; border-radius:999px; font-size:12px;">🔒 Đã khóa</span>`;

            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:38px; height:38px; border-radius:50%; background:${isManager ? '#dbeafe' : '#d1fae5'}; color:${isManager ? '#1e40af' : '#065f46'}; font-weight:800; display:grid; place-items:center; font-size:14px;">
                                ${s.name.charAt(0)}
                            </div>
                            <div>
                                <div style="font-weight:700; color:var(--text);">${s.name}</div>
                                <small style="color:var(--muted); font-size:12px;">@${s.username}</small>
                            </div>
                        </div>
                    </td>
                    <td>${roleBadge}</td>
                    <td style="font-size:13.5px; font-weight:600;">${s.phone}</td>
                    <td style="font-size:13px; color:var(--muted);">${s.email || '—'}</td>
                    <td style="font-size:12.5px; color:var(--muted);">${s.lastLogin || 'Chưa đăng nhập'}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align:right;">
                        <div style="display:flex; justify-content:flex-end; gap:6px;">
                            <button type="button" class="btn-edit-staff" data-id="${s.id}" style="background:#eef4ff; color:var(--primary); border:0; padding:6px 10px; border-radius:8px; font-weight:700; font-size:12.5px; cursor:pointer;">
                                Sửa
                            </button>
                            <button type="button" class="btn-toggle-lock" data-id="${s.id}" style="background:${isActive ? '#fff1f2' : '#ecfdf5'}; color:${isActive ? '#e11d48' : '#059669'}; border:0; padding:6px 10px; border-radius:8px; font-weight:700; font-size:12.5px; cursor:pointer;">
                                ${isActive ? 'Khóa' : 'Mở khóa'}
                            </button>
                            <button type="button" class="btn-reset-pw" data-id="${s.id}" style="background:#f1f5f9; color:#475569; border:0; padding:6px 10px; border-radius:8px; font-weight:700; font-size:12.5px; cursor:pointer;" title="Đặt lại mật khẩu">
                                🔑
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        attachEvents();
    }

    function attachEvents() {
        document.querySelectorAll('.btn-edit-staff').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const target = allStaff.find(s => s.id === id);
                if (target) openModal(target);
            };
        });

        document.querySelectorAll('.btn-toggle-lock').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const target = allStaff.find(s => s.id === id);
                if (target) {
                    target.status = target.status === 'active' ? 'locked' : 'active';
                    saveStaff(allStaff);
                    updateStats();
                    renderStaff();
                }
            };
        });

        document.querySelectorAll('.btn-reset-pw').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const target = allStaff.find(s => s.id === id);
                if (target) {
                    alert(`Đã đặt lại mật khẩu cho tài khoản @${target.username}.\nMật khẩu mặc định mới: ChainPoint@123`);
                }
            };
        });
    }

    function openModal(staff = null) {
        if (!modal) return;
        if (staff) {
            modalTitle.textContent = 'Chỉnh sửa tài khoản nhân viên';
            editingIdInput.value = staff.id;
            document.getElementById('staffName').value = staff.name;
            document.getElementById('staffUsername').value = staff.username;
            document.getElementById('staffUsername').disabled = true;
            document.getElementById('staffRole').value = staff.role;
            document.getElementById('staffPhone').value = staff.phone;
            document.getElementById('staffEmail').value = staff.email || '';
            document.getElementById('staffPasswordRow').style.display = 'none';
        } else {
            modalTitle.textContent = 'Thêm nhân viên mới';
            editingIdInput.value = '';
            document.getElementById('staffName').value = '';
            document.getElementById('staffUsername').value = '';
            document.getElementById('staffUsername').disabled = false;
            document.getElementById('staffRole').value = 'cashier';
            document.getElementById('staffPhone').value = '';
            document.getElementById('staffEmail').value = '';
            document.getElementById('staffPasswordRow').style.display = 'block';
        }
        modal.classList.add('active');
    }

    function closeModal() {
        if (modal) modal.classList.remove('active');
    }

    const addBtn = document.getElementById('btnAddStaff');
    const closeBtn = document.getElementById('closeStaffModal');
    const cancelBtn = document.getElementById('cancelStaffBtn');

    if (addBtn) addBtn.onclick = () => openModal(null);
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    if (staffForm) {
        staffForm.onsubmit = (e) => {
            e.preventDefault();
            const editId = editingIdInput.value;
            const name = document.getElementById('staffName').value.trim();
            const username = document.getElementById('staffUsername').value.trim();
            const role = document.getElementById('staffRole').value;
            const phone = document.getElementById('staffPhone').value.trim();
            const email = document.getElementById('staffEmail').value.trim();

            if (editId) {
                const target = allStaff.find(s => s.id === editId);
                if (target) {
                    target.name = name;
                    target.role = role;
                    target.phone = phone;
                    target.email = email;
                }
            } else {
                allStaff.unshift({
                    id: 'st_' + Date.now().toString().slice(-6),
                    name,
                    username,
                    role,
                    branch: currentBranch,
                    phone,
                    email,
                    status: 'active',
                    joinedAt: new Date().toLocaleDateString('vi-VN'),
                    lastLogin: 'Chưa đăng nhập'
                });
            }

            saveStaff(allStaff);
            updateStats();
            renderStaff();
            closeModal();
        };
    }

    if (filterTabs) {
        filterTabs.querySelectorAll('.filter-tab').forEach(btn => {
            btn.onclick = () => {
                filterTabs.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentRoleFilter = btn.getAttribute('data-role');
                renderStaff();
            };
        });
    }

    if (searchInput) {
        searchInput.oninput = (e) => {
            searchQuery = e.target.value.trim();
            renderStaff();
        };
    }

    updateStats();
    renderStaff();
})();

