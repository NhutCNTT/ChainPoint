// ChainPoint — Quản lý nhân viên Chi nhánh
// Kết nối trực tiếp với MySQL Backend API thay thế hoàn toàn localStorage

(function () {
    let staffList = [];
    let currentRoleFilter = 'all';
    let searchQuery = '';

    const currentBranchName = sessionStorage.getItem('cp_branch') || '';
    const currentBranchId = sessionStorage.getItem('cp_branch_id') || '';

    const tbody = document.getElementById('staffTableBody');
    const searchInput = document.getElementById('staffSearchInput');
    const filterTabs = document.getElementById('roleFilterTabs');
    const modal = document.getElementById('staffModal');
    const staffForm = document.getElementById('staffForm');
    const modalTitle = document.getElementById('staffModalTitle');
    const editingIdInput = document.getElementById('editingStaffId');

    async function loadBranchStaff() {
        try {
            const endpoint = currentBranchId ? `/staff?branchId=${currentBranchId}` : '/staff';
            let data;
            if (window.API) {
                data = await window.API.get(endpoint);
            } else {
                const res = await fetch(`http://localhost:8080/api/v1${endpoint}`);
                data = await res.json();
            }

            staffList = data.map(s => ({
                id: s.id,
                name: s.fullName,
                username: s.username,
                role: (s.role || '').toUpperCase().includes('MANAGER') ? 'manager' : 'cashier',
                roleLabel: (s.role || '').toUpperCase().includes('MANAGER') ? 'Quản lý cơ sở' : 'Thu ngân',
                branch: s.branchName || currentBranchName,
                phone: s.phone || '—',
                email: s.email || '—',
                status: s.status || 'active',
                joinedAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString('vi-VN') : '2026'
            }));
        } catch (e) {
            console.warn('Không thể nạp dữ liệu nhân sự chi nhánh từ MySQL API:', e);
            staffList = [];
        }

        updateStats();
        renderStaff();
    }

    function updateStats() {
        const total = staffList.length;
        const managers = staffList.filter(s => s.role === 'manager').length;
        const cashiers = staffList.filter(s => s.role === 'cashier').length;

        const statTotal = document.getElementById('statTotalStaff');
        const statMgr = document.getElementById('statManagers');
        const statCash = document.getElementById('statCashiers');

        if (statTotal) statTotal.textContent = total;
        if (statMgr) statMgr.textContent = managers;
        if (statCash) statCash.textContent = cashiers;
    }

    function getFilteredStaff() {
        return staffList.filter(s => {
            const matchRole = currentRoleFilter === 'all' || s.role === currentRoleFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchSearch = !q ||
                s.name.toLowerCase().includes(q) ||
                s.username.toLowerCase().includes(q) ||
                s.phone.includes(q);
            return matchRole && matchSearch;
        });
    }

    function renderStaff() {
        if (!tbody) return;
        const filtered = getFilteredStaff();

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 32px; color: var(--muted);">Không tìm thấy nhân viên nào trong Database.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(s => {
            const roleBadge = s.role === 'manager'
                ? `<span class="badge badge-primary">${s.roleLabel}</span>`
                : `<span class="badge badge-success">${s.roleLabel}</span>`;

            return `
                <tr>
                    <td>
                        <div style="font-weight: 700; color: var(--text);">${s.name}</div>
                        <div style="font-size: 11px; color: var(--muted);">${s.email}</div>
                    </td>
                    <td><code>${s.username}</code></td>
                    <td>${roleBadge}</td>
                    <td>${s.phone}</td>
                    <td><span class="badge badge-success">● Đang làm</span></td>
                    <td>
                        <div style="display:flex; gap:6px;">
                            <button type="button" class="action-icon-btn btn-edit-staff" data-id="${s.id}" title="Sửa">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button type="button" class="action-icon-btn btn-delete-staff" data-id="${s.id}" title="Xóa" style="color:var(--danger, #ef4444);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        bindEvents();
    }

    function bindEvents() {
        document.querySelectorAll('.btn-edit-staff').forEach(btn => {
            btn.onclick = () => openModal(btn.getAttribute('data-id'));
        });

        document.querySelectorAll('.btn-delete-staff').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Xác nhận xóa nhân viên này khỏi cơ sở dữ liệu?')) {
                    try {
                        if (window.API) {
                            await window.API.delete(`/staff/${id}`);
                        } else {
                            await fetch(`http://localhost:8080/api/v1/staff/${id}`, { method: 'DELETE' });
                        }
                        await loadBranchStaff();
                    } catch (e) {
                        alert('Lỗi xóa: ' + e.message);
                    }
                }
            };
        });
    }

    function openModal(staffId) {
        if (staffId) {
            const staff = staffList.find(s => String(s.id) === String(staffId));
            if (!staff) return;
            modalTitle.textContent = 'Chỉnh sửa nhân viên';
            editingIdInput.value = staff.id;
            document.getElementById('staffName').value = staff.name;
            document.getElementById('staffUsername').value = staff.username;
            document.getElementById('staffUsername').disabled = true;
            document.getElementById('staffRole').value = staff.role;
            document.getElementById('staffPhone').value = staff.phone === '—' ? '' : staff.phone;
            document.getElementById('staffEmail').value = staff.email === '—' ? '' : staff.email;
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
        staffForm.onsubmit = async (e) => {
            e.preventDefault();
            const editId = editingIdInput.value;
            const name = document.getElementById('staffName').value.trim();
            const username = document.getElementById('staffUsername').value.trim().toLowerCase();
            const role = document.getElementById('staffRole').value;
            const phone = document.getElementById('staffPhone').value.trim();
            const email = document.getElementById('staffEmail').value.trim();
            const password = document.getElementById('staffPassword') ? document.getElementById('staffPassword').value : '123456';

            const payload = {
                username,
                fullName: name,
                role: role === 'manager' ? 'ROLE_MANAGER' : 'ROLE_CASHIER',
                branchId: Number(currentBranchId),
                phone,
                email,
                password: password || undefined,
                status: 'active'
            };

            try {
                if (editId) {
                    if (window.API) {
                        await window.API.put(`/staff/${editId}`, payload);
                    } else {
                        await fetch(`http://localhost:8080/api/v1/staff/${editId}`, {
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
                await loadBranchStaff();
            } catch (err) {
                alert('Lỗi lưu nhân sự vào Database: ' + err.message);
            }
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

    loadBranchStaff();
})();
