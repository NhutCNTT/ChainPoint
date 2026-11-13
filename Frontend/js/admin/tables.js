// ChainPoint — Quản lý bàn & Sơ đồ vị trí nhà hàng
// Used by: pages/admin/tables.html

(function () {
    const STORAGE_KEY = 'cp_configured_tables';
    const AREAS_KEY = 'cp_areas';

    // Dữ liệu khu vực mặc định
    const DEFAULT_AREAS = [
        { id: 'f1', name: 'Tầng 1 (Sảnh chính)' },
        { id: 'f2', name: 'Tầng 2 (Phòng lạnh)' },
        { id: 'garden', name: 'Khu Sân Vườn' }
    ];

    // Dữ liệu bàn mẫu khởi tạo nếu chưa có trong localStorage
    const DEFAULT_TABLES = [
        // Tầng 1
        { id: 'A1', name: 'Bàn 01', area: 'f1', seats: 4, status: 'active', note: 'Gần cửa sổ sảnh chính' },
        { id: 'A2', name: 'Bàn 02', area: 'f1', seats: 4, status: 'active', note: '' },
        { id: 'A3', name: 'Bàn 03', area: 'f1', seats: 6, status: 'active', note: 'Bàn dài gia đình' },
        { id: 'A4', name: 'Bàn 04', area: 'f1', seats: 4, status: 'active', note: '' },
        { id: 'A5', name: 'Bàn 05', area: 'f1', seats: 4, status: 'active', note: '' },
        { id: 'A6', name: 'Bàn 06', area: 'f1', seats: 6, status: 'active', note: '' },
        { id: 'A7', name: 'Bàn 07', area: 'f1', seats: 4, status: 'disabled', note: 'Đang bảo dưỡng ghế' },
        { id: 'A8', name: 'Bàn VIP 1', area: 'f1', seats: 8, status: 'active', note: 'Phòng riêng Tầng 1' },

        // Tầng 2
        { id: 'B1', name: 'Bàn 2.1', area: 'f2', seats: 2, status: 'active', note: 'Bàn đôi cặp đôi' },
        { id: 'B2', name: 'Bàn 2.2', area: 'f2', seats: 4, status: 'active', note: '' },
        { id: 'B3', name: 'Bàn 2.3', area: 'f2', seats: 2, status: 'active', note: '' },
        { id: 'B4', name: 'Bàn 2.4', area: 'f2', seats: 4, status: 'active', note: '' },
        { id: 'B5', name: 'Bàn 2.5', area: 'f2', seats: 4, status: 'active', note: '' },
        { id: 'B6', name: 'Bàn 2.6', area: 'f2', seats: 6, status: 'active', note: '' },
        { id: 'B7', name: 'Bàn 2.7', area: 'f2', seats: 4, status: 'active', note: '' },
        { id: 'B8', name: 'Bàn VIP 2', area: 'f2', seats: 10, status: 'active', note: 'Phòng tiệc lớn' },

        // Sân vườn
        { id: 'C1', name: 'Vườn 01', area: 'garden', seats: 4, status: 'active', note: 'Dưới tán cây' },
        { id: 'C2', name: 'Vườn 02', area: 'garden', seats: 8, status: 'active', note: 'Bàn tiệc ngoài trời' },
        { id: 'C3', name: 'Vườn 03', area: 'garden', seats: 4, status: 'active', note: '' },
        { id: 'C4', name: 'Vườn 04', area: 'garden', seats: 4, status: 'active', note: '' },
        { id: 'C5', name: 'Vườn 05', area: 'garden', seats: 6, status: 'disabled', note: 'Khu vực che mưa sửa chữa' },
        { id: 'C6', name: 'Vườn 06', area: 'garden', seats: 4, status: 'active', note: '' }
    ];

    function loadTables() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error(e);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TABLES));
        return DEFAULT_TABLES;
    }

    function saveTables(tables) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
    }

    function loadAreas() {
        try {
            const raw = localStorage.getItem(AREAS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error(e);
        }
        localStorage.setItem(AREAS_KEY, JSON.stringify(DEFAULT_AREAS));
        return DEFAULT_AREAS;
    }

    let tables = loadTables();
    let areas = loadAreas();
    let currentAreaFilter = 'all';
    let currentSearch = '';
    let currentViewMode = 'grid'; // 'grid' (sơ đồ) | 'list' (danh sách)

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

    function updateStats() {
        if (statTotal) statTotal.textContent = tables.length;
        const activeCount = tables.filter(t => t.status === 'active').length;
        const disabledCount = tables.filter(t => t.status === 'disabled').length;
        const totalSeats = tables.reduce((sum, t) => sum + (parseInt(t.seats, 10) || 0), 0);

        if (statActive) statActive.textContent = activeCount;
        if (statDisabled) statDisabled.textContent = disabledCount;
        if (statSeats) statSeats.textContent = totalSeats;
    }

    function renderAreaFilterTabs() {
        if (!areaTabsContainer) return;
        const totalAll = tables.length;
        let html = `
            <button class="filter-tab ${currentAreaFilter === 'all' ? 'active' : ''}" data-area="all" type="button">
                Tất cả khu vực (${totalAll})
            </button>
        `;
        areas.forEach(a => {
            const count = tables.filter(t => t.area === a.id).length;
            html += `
                <button class="filter-tab ${currentAreaFilter === a.id ? 'active' : ''}" data-area="${a.id}" type="button">
                    ${a.name} (${count})
                </button>
            `;
        });
        areaTabsContainer.innerHTML = html;

        areaTabsContainer.querySelectorAll('.filter-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                currentAreaFilter = btn.dataset.area;
                renderAreaFilterTabs();
                render();
            });
        });
    }

    function populateAreaSelect() {
        if (!formTableArea) return;
        formTableArea.innerHTML = areas.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    }

    function filterTablesList() {
        return tables.filter(t => {
            const matchArea = currentAreaFilter === 'all' || t.area === currentAreaFilter;
            const q = currentSearch.toLowerCase().trim();
            const matchSearch = !q || t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || (t.note && t.note.toLowerCase().includes(q));
            return matchArea && matchSearch;
        });
    }

    function renderGrid(filtered) {
        if (!gridContainer) return;
        if (filtered.length === 0) {
            gridContainer.innerHTML = `
                <div class="empty-tables-box">
                    <div class="empty-icon">🍽️</div>
                    <h3>Không tìm thấy bàn nào</h3>
                    <p>Không có vị trí bàn nào khớp với bộ lọc hiện tại. Hãy thử chọn khu vực khác hoặc thêm bàn mới.</p>
                    <button class="btn-primary" type="button" id="emptyAddBtn">+ Tạo bàn mới</button>
                </div>
            `;
            const emptyBtn = document.getElementById('emptyAddBtn');
            if (emptyBtn) emptyBtn.addEventListener('click', openAddModal);
            return;
        }

        // Group by area
        const displayAreas = currentAreaFilter === 'all' ? areas : areas.filter(a => a.id === currentAreaFilter);

        let html = '';
        displayAreas.forEach(area => {
            const areaTables = filtered.filter(t => t.area === area.id);
            if (areaTables.length === 0) return;

            html += `
                <div class="area-section">
                    <div class="area-header">
                        <div class="area-title">
                            <span>📍 ${area.name}</span>
                            <span class="area-count">${areaTables.length} bàn</span>
                        </div>
                    </div>
                    <div class="table-cards-grid">
            `;

            areaTables.forEach(t => {
                const isActive = t.status === 'active';
                html += `
                    <div class="table-card ${!isActive ? 'is-disabled' : ''}" data-id="${t.id}">
                        <div class="table-card-top">
                            <div>
                                <div class="table-card-id">${t.id}</div>
                                <div class="table-card-name">${t.name}</div>
                            </div>
                            <span class="badge ${isActive ? 'badge-success' : 'badge-neutral'}">
                                ${isActive ? '● Đang hoạt động' : '⏸ Ngừng sử dụng'}
                            </span>
                        </div>

                        <div class="table-card-meta">
                            <span class="seats-tag" title="Sức chứa bàn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                ${t.seats} chỗ ngồi
                            </span>
                            ${t.note ? `<span style="font-size:12px; color:var(--muted);">${t.note}</span>` : ''}
                        </div>

                        <div class="table-card-actions">
                            <button class="action-icon-btn btn-toggle-status" data-id="${t.id}" title="${isActive ? 'Ngừng sử dụng bàn' : 'Kích hoạt lại bàn'}" type="button">
                                ${isActive 
                                    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>`
                                    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
                                }
                            </button>
                            <button class="action-icon-btn btn-edit-table" data-id="${t.id}" title="Chỉnh sửa thông tin bàn" type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="action-icon-btn danger btn-delete-table" data-id="${t.id}" title="Xóa bàn" type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        gridContainer.innerHTML = html;
        bindCardActionButtons();
    }

    function renderList(filtered) {
        if (!listContainer) return;
        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-tables-box">
                    <h3>Không tìm thấy bàn nào</h3>
                    <p>Không có vị trí bàn nào khớp với bộ lọc.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="data-table-card">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Mã bàn</th>
                                <th>Tên hiển thị</th>
                                <th>Khu vực</th>
                                <th>Sức chứa</th>
                                <th>Trạng thái</th>
                                <th>Ghi chú</th>
                                <th style="text-align: right;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        filtered.forEach(t => {
            const areaObj = areas.find(a => a.id === t.area) || { name: t.area };
            const isActive = t.status === 'active';
            html += `
                <tr>
                    <td><strong>${t.id}</strong></td>
                    <td style="font-weight: 600;">${t.name}</td>
                    <td><span class="badge badge-primary">${areaObj.name}</span></td>
                    <td><strong>${t.seats}</strong> người</td>
                    <td>
                        <span class="badge ${isActive ? 'badge-success' : 'badge-neutral'}">
                            ${isActive ? 'Đang hoạt động' : 'Ngừng sử dụng'}
                        </span>
                    </td>
                    <td style="color:var(--muted); font-size:13px;">${t.note || '—'}</td>
                    <td style="text-align: right;">
                        <button class="btn-secondary btn-toggle-status" data-id="${t.id}" style="padding: 6px 12px; font-size: 12px; margin-right: 6px;" type="button">
                            ${isActive ? 'Tạm ngưng' : 'Kích hoạt'}
                        </button>
                        <button class="btn-secondary btn-edit-table" data-id="${t.id}" style="padding: 6px 12px; font-size: 12px; margin-right: 6px;" type="button">
                            Sửa
                        </button>
                        <button class="btn-danger-outline btn-delete-table" data-id="${t.id}" style="padding: 6px 12px; font-size: 12px;" type="button">
                            Xóa
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        listContainer.innerHTML = html;
        bindCardActionButtons();
    }

    function render() {
        const filtered = filterTablesList();
        updateStats();

        if (currentViewMode === 'grid') {
            if (gridContainer) gridContainer.hidden = false;
            if (listContainer) listContainer.hidden = true;
            renderGrid(filtered);
        } else {
            if (gridContainer) gridContainer.hidden = true;
            if (listContainer) listContainer.hidden = false;
            renderList(filtered);
        }
    }

    function bindCardActionButtons() {
        // Toggle status (Ngừng sử dụng / Kích hoạt lại)
        document.querySelectorAll('.btn-toggle-status').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const table = tables.find(t => t.id === id);
                if (!table) return;

                const willDisable = table.status === 'active';
                const confirmMsg = willDisable
                    ? `Bạn có chắc chắn muốn NGỪNG SỬ DỤNG bàn "${table.id} - ${table.name}"? Bàn này sẽ tạm ẩn khỏi màn hình POS.`
                    : `Kích hoạt lại bàn "${table.id} - ${table.name}" để sẵn sàng phục vụ trên POS?`;

                if (confirm(confirmMsg)) {
                    table.status = willDisable ? 'disabled' : 'active';
                    saveTables(tables);
                    render();
                }
            });
        });

        // Edit
        document.querySelectorAll('.btn-edit-table').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                openEditModal(id);
            });
        });

        // Delete
        document.querySelectorAll('.btn-delete-table').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const table = tables.find(t => t.id === id);
                if (!table) return;

                if (confirm(`Xác nhận XÓA VĨNH VIỄN bàn "${table.id} - ${table.name}" khỏi hệ thống?`)) {
                    tables = tables.filter(t => t.id !== id);
                    saveTables(tables);
                    renderAreaFilterTabs();
                    render();
                }
            });
        });
    }

    // Modal Add / Edit
    function openAddModal() {
        editingOriginalId.value = '';
        modalTitle.textContent = 'Thêm vị trí bàn mới';
        formTableId.value = '';
        formTableId.disabled = false;
        formTableName.value = '';
        formTableSeats.value = '4';
        formTableStatus.value = 'active';
        formTableNote.value = '';
        if (currentAreaFilter !== 'all') {
            formTableArea.value = currentAreaFilter;
        }
        tableFormModal.classList.add('is-open');
        formTableId.focus();
    }

    function openEditModal(id) {
        const table = tables.find(t => t.id === id);
        if (!table) return;

        editingOriginalId.value = table.id;
        modalTitle.textContent = `Chỉnh sửa bàn: ${table.id}`;
        formTableId.value = table.id;
        formTableId.disabled = false;
        formTableName.value = table.name;
        formTableArea.value = table.area;
        formTableSeats.value = table.seats || 4;
        formTableStatus.value = table.status || 'active';
        formTableNote.value = table.note || '';
        tableFormModal.classList.add('is-open');
    }

    function closeModal() {
        tableFormModal.classList.remove('is-open');
    }

    // Form Submit
    if (tableForm) {
        tableForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const originalId = editingOriginalId.value;
            const id = formTableId.value.trim().toUpperCase();
            const name = formTableName.value.trim();
            const area = formTableArea.value;
            const seats = parseInt(formTableSeats.value, 10) || 4;
            const status = formTableStatus.value;
            const note = formTableNote.value.trim();

            if (!id) return alert('Vui lòng nhập mã bàn.');
            if (!name) return alert('Vui lòng nhập tên bàn.');

            // Check duplicate ID
            const duplicate = tables.find(t => t.id.toLowerCase() === id.toLowerCase() && t.id !== originalId);
            if (duplicate) {
                return alert(`Mã bàn "${id}" đã tồn tại. Vui lòng chọn mã bàn khác.`);
            }

            if (originalId) {
                // Update
                const table = tables.find(t => t.id === originalId);
                if (table) {
                    table.id = id;
                    table.name = name;
                    table.area = area;
                    table.seats = seats;
                    table.status = status;
                    table.note = note;
                }
            } else {
                // Add new
                tables.push({
                    id, name, area, seats, status, note
                });
            }

            saveTables(tables);
            closeModal();
            renderAreaFilterTabs();
            render();
        });
    }

    // Modal Close Triggers
    const modalCloseBtn = document.getElementById('closeModalBtn');
    const modalCancelBtn = document.getElementById('cancelModalBtn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    if (tableFormModal) {
        tableFormModal.addEventListener('click', (e) => {
            if (e.target === tableFormModal) closeModal();
        });
    }

    // Add Button Header
    const addTableBtn = document.getElementById('addTableBtn');
    if (addTableBtn) addTableBtn.addEventListener('click', openAddModal);

    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            render();
        });
    }

    // View toggle buttons
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

    // Initial setup
    populateAreaSelect();
    renderAreaFilterTabs();
    render();
})();

