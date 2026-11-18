// ChainPoint — Quản lý chuỗi chi nhánh (Dành cho Owner)
// Sử dụng API Backend MySQL thay thế hoàn toàn localStorage

(function () {
    let branches = [];
    let currentSearch = '';

    const branchesGrid = document.getElementById('branchesGrid');
    const searchInput = document.getElementById('branchSearchInput');
    const addBranchBtn = document.getElementById('addBranchBtn');
    const branchModal = document.getElementById('branchModal');
    const branchForm = document.getElementById('branchForm');
    const branchModalTitle = document.getElementById('branchModalTitle');
    const editingBranchId = document.getElementById('editingBranchId');

    const formBranchCode = document.getElementById('formBranchCode');
    const formBranchName = document.getElementById('formBranchName');
    const formBranchAddress = document.getElementById('formBranchAddress');
    const formBranchPhone = document.getElementById('formBranchPhone');
    const formBranchManager = document.getElementById('formBranchManager');
    const formBranchHours = document.getElementById('formBranchHours');
    const formBranchStatus = document.getElementById('formBranchStatus');

    // Stats
    const statTotalBranches = document.getElementById('statTotalBranches');
    const statOpenBranches = document.getElementById('statOpenBranches');
    const statTotalTables = document.getElementById('statTotalTables');
    const statTotalStaff = document.getElementById('statTotalStaff');

    async function loadBranches() {
        try {
            if (window.API) {
                branches = await window.API.get('/branches');
            } else {
                const res = await fetch('http://localhost:8080/api/v1/branches');
                branches = await res.json();
            }
        } catch (e) {
            console.error('Không thể nạp danh sách chi nhánh từ MySQL API:', e);
            branches = [];
        }
        render();
    }

    function formatCurrency(n) {
        return (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';
    }

    function updateStats() {
        if (statTotalBranches) statTotalBranches.textContent = branches.length;
        if (statOpenBranches) statOpenBranches.textContent = branches.filter(b => b.status === 'open').length;
        if (statTotalTables) {
            const sum = branches.reduce((acc, b) => acc + (b.tablesCount || 0), 0);
            statTotalTables.textContent = sum;
        }
        if (statTotalStaff) {
            const sum = branches.reduce((acc, b) => acc + (b.staffCount || 0), 0);
            statTotalStaff.textContent = sum;
        }
    }

    function render() {
        updateStats();
        if (!branchesGrid) return;

        const filtered = branches.filter(b => {
            const q = currentSearch.toLowerCase().trim();
            if (!q) return true;
            return (b.name && b.name.toLowerCase().includes(q)) ||
                   (b.code && b.code.toLowerCase().includes(q)) ||
                   (b.address && b.address.toLowerCase().includes(q));
        });

        if (filtered.length === 0) {
            branchesGrid.innerHTML = `
                <div class="empty-tables-box" style="grid-column: 1 / -1;">
                    <div class="empty-icon">🏢</div>
                    <h3>Không tìm thấy chi nhánh nào</h3>
                    <p>Thử tìm kiếm với từ khóa khác hoặc tạo chi nhánh mới vào cơ sở dữ liệu.</p>
                </div>
            `;
            return;
        }

        branchesGrid.innerHTML = filtered.map(b => {
            const isOpen = b.status === 'open';
            const revenueDisplay = b.weeklyRevenue ? formatCurrency(b.weeklyRevenue) : '0 ₫';
            return `
                <div class="table-card" style="padding: 24px;">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
                        <div>
                            <span class="badge badge-primary" style="font-size: 11px; margin-bottom: 6px;">${b.code || ''}</span>
                            <h3 style="font-size: 18px; font-weight: 800; color: var(--text);">${b.name || ''}</h3>
                            <p style="font-size: 13px; color: var(--muted); margin-top: 4px;">📍 ${b.address || ''}</p>
                        </div>
                        <span class="badge ${isOpen ? 'badge-success' : 'badge-neutral'}">
                            ${isOpen ? '● Đang mở cửa' : '⏸ Tạm đóng'}
                        </span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border-radius: 12px; padding: 14px; margin: 8px 0 16px;">
                        <div>
                            <small style="color: var(--muted); font-size: 12px;">Quản lý cơ sở</small>
                            <div style="font-weight: 700; font-size: 13.5px; color: var(--text); margin-top: 2px;">👤 ${b.managerName || 'Chưa chỉ định'}</div>
                        </div>
                        <div>
                            <small style="color: var(--muted); font-size: 12px;">Hotline</small>
                            <div style="font-weight: 700; font-size: 13.5px; color: var(--text); margin-top: 2px;">📞 ${b.phone || '—'}</div>
                        </div>
                        <div>
                            <small style="color: var(--muted); font-size: 12px;">Quy mô</small>
                            <div style="font-weight: 700; font-size: 13.5px; color: var(--text); margin-top: 2px;">🍽️ ${b.tablesCount || 0} bàn · 👥 ${b.staffCount || 0} NV</div>
                        </div>
                        <div>
                            <small style="color: var(--muted); font-size: 12px;">Doanh thu tuần</small>
                            <div style="font-weight: 800; font-size: 13.5px; color: var(--primary); margin-top: 2px;">💰 ${revenueDisplay}</div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 16px;">
                        <span>⏰ Giờ mở cửa: <strong>${b.openHours || '08:00 - 22:00'}</strong></span>
                        <a href="dashboard.html?branchId=${b.id}&branch=${encodeURIComponent(b.name)}" style="color: var(--primary); font-weight: 700; text-decoration: none;">Xem Dashboard →</a>
                    </div>

                    <div class="table-card-actions">
                        <button class="btn-primary btn-switch-branch" data-id="${b.id}" data-name="${b.name}" style="padding: 7px 14px; font-size: 12.5px;" type="button">
                            Vào quản trị
                        </button>
                        <button class="action-icon-btn btn-edit-branch" data-id="${b.id}" title="Chỉnh sửa thông tin" type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        bindActions();
    }

    function bindActions() {
        document.querySelectorAll('.btn-switch-branch').forEach(btn => {
            btn.addEventListener('click', () => {
                const bId = btn.dataset.id;
                const bName = btn.dataset.name;
                sessionStorage.setItem('cp_branch_id', bId);
                sessionStorage.setItem('cp_branch', bName);
                if (window.showToast) {
                    window.showToast(`Chuyển sang: ${bName}`);
                }
                window.location.href = `dashboard.html?branchId=${bId}&branch=${encodeURIComponent(bName)}`;
            });
        });

        document.querySelectorAll('.btn-edit-branch').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                openEditModal(id);
            });
        });
    }

    function openAddModal() {
        editingBranchId.value = '';
        branchModalTitle.textContent = 'Tạo chi nhánh mới';
        formBranchCode.value = 'CN-' + (branches.length + 1);
        formBranchName.value = '';
        formBranchAddress.value = '';
        formBranchPhone.value = '';
        formBranchManager.value = '';
        formBranchHours.value = '08:00 - 22:30';
        formBranchStatus.value = 'open';

        branchModal.classList.add('is-open');
        formBranchName.focus();
    }

    function openEditModal(id) {
        const b = branches.find(x => String(x.id) === String(id));
        if (!b) return;

        editingBranchId.value = b.id;
        branchModalTitle.textContent = `Chỉnh sửa: ${b.name}`;
        formBranchCode.value = b.code || '';
        formBranchName.value = b.name || '';
        formBranchAddress.value = b.address || '';
        formBranchPhone.value = b.phone || '';
        formBranchManager.value = b.managerName || '';
        formBranchHours.value = b.openHours || '08:00 - 22:30';
        formBranchStatus.value = b.status || 'open';

        branchModal.classList.add('is-open');
    }

    function closeModal() {
        branchModal.classList.remove('is-open');
    }

    if (branchForm) {
        branchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = editingBranchId.value;
            const payload = {
                code: formBranchCode.value.trim().toUpperCase(),
                name: formBranchName.value.trim(),
                address: formBranchAddress.value.trim(),
                phone: formBranchPhone.value.trim(),
                managerName: formBranchManager.value.trim(),
                openHours: formBranchHours.value.trim(),
                status: formBranchStatus.value,
                vatPercent: 8.0
            };

            if (!payload.name) return alert('Vui lòng nhập tên chi nhánh.');

            try {
                if (id) {
                    if (window.API) {
                        await window.API.put(`/branches/${id}`, payload);
                    } else {
                        await fetch(`http://localhost:8080/api/v1/branches/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    }
                } else {
                    if (window.API) {
                        await window.API.post('/branches', payload);
                    } else {
                        await fetch('http://localhost:8080/api/v1/branches', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    }
                }
                closeModal();
                await loadBranches();
            } catch (err) {
                alert('Lỗi khi lưu chi nhánh vào Database: ' + err.message);
            }
        });
    }

    const closeBranchModalBtn = document.getElementById('closeBranchModalBtn');
    const cancelBranchModalBtn = document.getElementById('cancelBranchModalBtn');
    if (closeBranchModalBtn) closeBranchModalBtn.addEventListener('click', closeModal);
    if (cancelBranchModalBtn) cancelBranchModalBtn.addEventListener('click', closeModal);
    if (branchModal) {
        branchModal.addEventListener('click', (e) => {
            if (e.target === branchModal) closeModal();
        });
    }

    if (addBranchBtn) addBranchBtn.addEventListener('click', openAddModal);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            render();
        });
    }

    loadBranches();
})();
