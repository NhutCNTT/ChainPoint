// ChainPoint — Quản lý bàn & Sơ đồ vị trí nhà hàng
// Kết nối trực tiếp với MySQL Backend API thay thế hoàn toàn localStorage

(function () {
    let tables = [];
    let areas = [];
    let currentAreaFilter = 'all';
    let currentSearch = '';
    let currentViewMode = 'grid';

    const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // DOM Elements
    const gridContainer = document.getElementById('tablesGridContainer');
    const listContainer = document.getElementById('tablesListContainer');
    const areaTabsContainer = document.getElementById('areaFilterTabs');
    const searchInput = document.getElementById('tablesSearchInput');
    const tableFormModal = document.getElementById('tableFormModal');
    const tableForm = document.getElementById('tableForm');
    const modalTitle = document.getElementById('modalTitle');
    const formTableId = document.getElementById('formTableId');
    const formTableName = document.getElementById('formTableName');
    const formTableArea = document.getElementById('formTableArea');
    const formTableSeats = document.getElementById('formTableSeats');
    const formTableStatus = document.getElementById('formTableStatus');
    const formTableNote = document.getElementById('formTableNote');
    const editingOriginalId = document.getElementById('editingOriginalId');

    // Stats Elements
    const statTotal = document.getElementById('statTotalTables');
    const statActive = document.getElementById('statActiveTables');
    const statDisabled = document.getElementById('statDisabledTables');
    const statSeats = document.getElementById('statTotalSeats');

    async function resolveBranchId() {
        let branchId = sessionStorage.getItem('cp_branch_id') || '';
        if (branchId) return Number(branchId);
        try {
            const branches = window.API
                ? await window.API.get('/branches')
                : await (await fetch('http://localhost:8080/api/v1/branches')).json();
            if (Array.isArray(branches) && branches.length > 0) {
                const branchName = sessionStorage.getItem('cp_branch') || '';
                const matched = (branchName && branches.find(b => b.name === branchName)) || branches[0];
                branchId = matched.id;
                sessionStorage.setItem('cp_branch_id', branchId);
                return Number(branchId);
            }
        } catch (ignored) {}
        return null;
    }

    async function loadTables() {
        try {
            const branchId = await resolveBranchId();
            const endpoint = branchId ? `/tables?branchId=${branchId}` : '/tables';
            let list = [];
            if (window.API) {
                list = await window.API.get(endpoint);
            } else {
                const res = await fetch(`http://localhost:8080/api/v1${endpoint}`);
                list = await res.json();
            }
            tables = (Array.isArray(list) ? list : []).map(t => ({
                id: t.code,
                realId: t.id,
                name: t.name || ('Bàn ' + t.code),
                area: t.area || 'Tầng 1',
                seats: t.seats || 4,
                status: t.status || 'active',
                note: t.note || '',
                branchId: t.branchId || branchId
            }));
            const uniqueAreas = [...new Set(tables.map(t => t.area).filter(Boolean))];
            areas = uniqueAreas.length > 0
                ? uniqueAreas.map(a => ({ id: a, name: a }))
                : [{ id: 'Tầng 1', name: 'Tầng 1' }];
        } catch (e) {
            console.error('Không thể nạp dữ liệu bàn từ MySQL API:', e);
            tables = [];
            areas = [{ id: 'Tầng 1', name: 'Tầng 1' }];
        }

        updateStats();
        populateAreaSelect();
        renderAreaFilterTabs();
        render();
    }

    function updateStats() {
        if (statTotal) statTotal.textContent = tables.length;
        if (statActive) statActive.textContent = tables.filter(t => t.status === 'active').length;
        if (statDisabled) statDisabled.textContent = tables.filter(t => t.status === 'disabled').length;
        if (statSeats) {
            const sumSeats = tables.reduce((acc, t) => acc + (t.status === 'active' ? (parseInt(t.seats, 10) || 0) : 0), 0);
            statSeats.textContent = sumSeats;
        }
    }

    function populateAreaSelect() {
        if (!formTableArea) return;
        formTableArea.innerHTML = areas.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`).join('');
    }

    function renderAreaFilterTabs() {
        if (!areaTabsContainer) return;
        const totalCount = tables.length;
        let html = `
            <button class="area-tab ${currentAreaFilter === 'all' ? 'active' : ''}" data-area="all" type="button">
                <span>Tất cả khu vực</span>
                <span class="area-count">${totalCount}</span>
            </button>
        `;

        areas.forEach(a => {
            const count = tables.filter(t => t.area === a.id).length;
            const isActive = currentAreaFilter === a.id ? 'active' : '';
            html += `
                <button class="area-tab ${isActive}" data-area="${escapeHtml(a.id)}" type="button">
                    <span>${escapeHtml(a.name)}</span>
                    <span class="area-count">${count}</span>
                </button>
            `;
        });

        areaTabsContainer.innerHTML = html;
        areaTabsContainer.querySelectorAll('.area-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                currentAreaFilter = tab.dataset.area;
                renderAreaFilterTabs();
                render();
            });
        });
    }

    function getFilteredTables() {
        return tables.filter(t => {
            const areaMatch = currentAreaFilter === 'all' || t.area === currentAreaFilter;
            const q = currentSearch.toLowerCase().trim();
            const searchMatch = !q ||
                t.name.toLowerCase().includes(q) ||
                t.id.toLowerCase().includes(q) ||
                (t.note && t.note.toLowerCase().includes(q));
            return areaMatch && searchMatch;
        });
    }

    function getAreaName(areaId) {
        const a = areas.find(x => x.id === areaId);
        return a ? a.name : areaId;
    }

    function render() {
        updateStats();
        const filtered = getFilteredTables();

        if (currentViewMode === 'grid') {
            if (gridContainer) gridContainer.hidden = false;
            if (listContainer) listContainer.hidden = true;
            renderGrid(filtered);
        } else {
            if (gridContainer) gridContainer.hidden = true;
            if (listContainer) listContainer.hidden = false;
            renderList(filtered);
        }

        bindActionButtons();
    }

    function renderGrid(list) {
        if (!gridContainer) return;
        if (list.length === 0) {
            gridContainer.innerHTML = `
                <div class="empty-tables-box">
                    <div class="empty-icon">🍽️</div>
                    <h3>Không tìm thấy bàn nào</h3>
                    <p>Thử tìm kiếm với từ khóa khác hoặc tạo thêm bàn mới vào Database.</p>
                </div>
            `;
            return;
        }

        gridContainer.innerHTML = list.map(t => {
            const isActive = t.status === 'active';
            const badgeClass = isActive ? 'badge-success' : 'badge-neutral';
            const badgeText = isActive ? '● Đang phục vụ' : '⏸ Tạm ngừng';

            return `
                <div class="table-card ${!isActive ? 'is-disabled' : ''}">
                    <div class="table-card-top">
                        <div class="table-code-badge">${escapeHtml(t.id)}</div>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="table-card-name">${escapeHtml(t.name)}</div>
                    <div class="table-card-meta">
                        <div class="table-meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>${escapeHtml(getAreaName(t.area))}</span>
                        </div>
                        <div class="table-meta-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            <span>${escapeHtml(t.seats)} chỗ ngồi</span>
                        </div>
                    </div>
                    ${t.note ? `<div class="table-card-note">💡 ${escapeHtml(t.note)}</div>` : ''}
                    <div class="table-card-actions">
                        <button class="action-icon-btn btn-edit-table" data-id="${escapeHtml(t.id)}" title="Chỉnh sửa bàn" type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="action-icon-btn btn-delete-table" data-id="${escapeHtml(t.realId || t.id)}" title="Xóa bàn" type="button" style="color: var(--danger, #ef4444);">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderList(list) {
        const tbody = document.getElementById('tablesTableBody');
        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 32px; color: var(--muted);">Không có bàn nào phù hợp.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(t => `
            <tr>
                <td><code>${escapeHtml(t.id)}</code></td>
                <td><strong>${escapeHtml(t.name)}</strong></td>
                <td>${escapeHtml(getAreaName(t.area))}</td>
                <td>${escapeHtml(t.seats)} chỗ</td>
                <td><span class="badge ${t.status === 'active' ? 'badge-success' : 'badge-neutral'}">${t.status === 'active' ? 'Hoạt động' : 'Tạm ngừng'}</span></td>
                <td>${escapeHtml(t.note || '—')}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="action-icon-btn btn-edit-table" data-id="${escapeHtml(t.id)}" title="Sửa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="action-icon-btn btn-delete-table" data-id="${escapeHtml(t.realId || t.id)}" title="Xóa" style="color:var(--danger, #ef4444);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function bindActionButtons() {
        document.querySelectorAll('.btn-edit-table').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });

        document.querySelectorAll('.btn-delete-table').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if (confirm('Bạn có chắc muốn xóa bàn này khỏi Database?')) {
                    try {
                        if (window.API) {
                            await window.API.delete(`/tables/${id}`);
                        } else {
                            await fetch(`http://localhost:8080/api/v1/tables/${id}`, { method: 'DELETE' });
                        }
                        await loadTables();
                    } catch (err) {
                        alert('Lỗi xóa bàn: ' + err.message);
                    }
                }
            });
        });
    }

    function openAddModal() {
        editingOriginalId.value = '';
        modalTitle.textContent = 'Thêm bàn mới';
        formTableId.value = 'A' + (tables.length + 1);
        formTableId.disabled = false;
        formTableName.value = 'Bàn ' + (tables.length + 1);
        formTableArea.value = currentAreaFilter !== 'all' ? currentAreaFilter : (areas[0] ? areas[0].id : 'Tầng 1');
        formTableSeats.value = '4';
        formTableStatus.value = 'active';
        formTableNote.value = '';
        tableFormModal.classList.add('is-open');
        tableFormModal.classList.add('active');
    }

    function openEditModal(tableId) {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        editingOriginalId.value = table.realId || table.id;
        modalTitle.textContent = `Chỉnh sửa: ${table.name}`;
        formTableId.value = table.id;
        formTableId.disabled = true;
        formTableName.value = table.name;
        formTableArea.value = table.area;
        formTableSeats.value = table.seats;
        formTableStatus.value = table.status;
        formTableNote.value = table.note || '';
        tableFormModal.classList.add('is-open');
        tableFormModal.classList.add('active');
    }

    function closeModal() {
        tableFormModal.classList.remove('is-open');
        tableFormModal.classList.remove('active');
    }

    if (tableForm) {
        tableForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const realId = editingOriginalId.value;
            const code = formTableId.value.trim().toUpperCase();
            const name = formTableName.value.trim();
            const area = formTableArea.value;
            const seats = parseInt(formTableSeats.value, 10) || 4;
            const status = formTableStatus.value;
            const note = formTableNote.value.trim();
            const branchId = await resolveBranchId();

            if (!branchId) {
                alert('Chưa có chi nhánh nào trong Database. Vui lòng tạo chi nhánh trước khi thêm bàn.');
                return;
            }

            const payload = {
                code,
                name,
                area,
                seats,
                status,
                note,
                branchId
            };

            try {
                if (realId && !isNaN(Number(realId))) {
                    if (window.API) {
                        await window.API.put(`/tables/${realId}`, payload);
                    } else {
                        await fetch(`http://localhost:8080/api/v1/tables/${realId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    }
                } else {
                    if (window.API) {
                        await window.API.post('/tables', payload);
                    } else {
                        await fetch('http://localhost:8080/api/v1/tables', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    }
                }
                closeModal();
                await loadTables();
            } catch (err) {
                alert('Lỗi lưu bàn vào Database: ' + err.message);
            }
        });
    }

    const modalCloseBtn = document.getElementById('closeModalBtn');
    const modalCancelBtn = document.getElementById('cancelModalBtn') || document.getElementById('cancelFormBtn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    if (tableFormModal) {
        tableFormModal.addEventListener('click', (e) => {
            if (e.target === tableFormModal) closeModal();
        });
    }

    const addTableBtn = document.getElementById('addTableBtn');
    if (addTableBtn) addTableBtn.addEventListener('click', openAddModal);

    const btnGridView = document.getElementById('btnGridView');
    const btnListView = document.getElementById('btnListView');
    if (btnGridView && btnListView) {
        btnGridView.addEventListener('click', () => {
            currentViewMode = 'grid';
            btnGridView.classList.add('active');
            btnListView.classList.remove('active');
            render();
        });
        btnListView.addEventListener('click', () => {
            currentViewMode = 'list';
            btnListView.classList.add('active');
            btnGridView.classList.remove('active');
            render();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            render();
        });
    }

    loadTables();
})();
