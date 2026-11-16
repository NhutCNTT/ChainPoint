// ChainPoint — Quản lý Thực đơn (Menu) Chi nhánh
// Kết nối trực tiếp với MySQL Backend API thay thế hoàn toàn localStorage

(function () {
    const DEFAULT_CATEGORIES = [
        { id: 'all', name: 'Tất cả danh mục', icon: '✨' },
        { id: 'hot', name: 'Món nóng', icon: '🔥' },
        { id: 'cold', name: 'Món lạnh', icon: '🥗' },
        { id: 'drink', name: 'Đồ uống', icon: '🥤' },
        { id: 'dessert', name: 'Tráng miệng', icon: '🍰' },
        { id: 'other', name: 'Món ăn kèm', icon: '🍚' }
    ];

    let categories = [...DEFAULT_CATEGORIES];
    let menu = [];
    let currentCategory = 'all';
    let searchQuery = '';

    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    // DOM Elements
    const gridContainer = document.getElementById('menuGridContainer');
    const tableContainer = document.getElementById('menuTableBody');
    const catTabsContainer = document.getElementById('categoryTabs');
    const dishCatSelect = document.getElementById('dishCat');
    const searchInput = document.getElementById('menuSearchInput');
    const modal = document.getElementById('dishModal');
    const dishForm = document.getElementById('dishForm');
    const modalTitle = document.getElementById('dishModalTitle');
    const editingIdInput = document.getElementById('editingDishId');

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

    async function loadCategoriesFromDB() {
        try {
            const list = window.API
                ? await window.API.get('/categories')
                : await (await fetch('http://localhost:8080/api/v1/categories')).json();
            if (Array.isArray(list) && list.length > 0) {
                categories = [
                    { id: 'all', name: 'Tất cả danh mục', icon: '✨' },
                    ...list.map(c => ({
                        id: c.code,
                        name: c.name,
                        icon: c.icon || '🍽️'
                    }))
                ];
            }
        } catch (ignored) {
            categories = [...DEFAULT_CATEGORIES];
        }
        populateCategorySelect();
    }

    function populateCategorySelect() {
        if (!dishCatSelect) return;
        const selectable = categories.filter(c => c.id !== 'all');
        dishCatSelect.innerHTML = selectable.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    }

    function getCategoryDisplay(catId) {
        const found = categories.find(c => c.id === catId);
        return found ? `${found.icon} ${found.name}` : catId;
    }

    async function loadMenu() {
        await loadCategoriesFromDB();
        try {
            const branchId = await resolveBranchId();
            const endpoint = branchId ? `/products?branchId=${branchId}` : '/products';
            let products = window.API
                ? await window.API.get(endpoint)
                : await (await fetch(`http://localhost:8080/api/v1${endpoint}`)).json();

            if (Array.isArray(products) && products.length === 0 && branchId) {
                products = window.API
                    ? await window.API.get('/products')
                    : await (await fetch('http://localhost:8080/api/v1/products')).json();
            }

            menu = (Array.isArray(products) ? products : []).map(p => ({
                id: p.code || ('m' + p.id),
                realId: p.id,
                cat: p.category || 'other',
                name: p.name,
                price: Number(p.price || 0),
                emoji: p.emoji || '🍲',
                status: p.status || 'available',
                soldCount: 0
            }));

            // Bổ sung danh mục từ sản phẩm thực tế trong DB nếu chưa có trong danh sách
            const knownCatIds = new Set(categories.map(c => c.id));
            menu.forEach(item => {
                if (item.cat && !knownCatIds.has(item.cat)) {
                    knownCatIds.add(item.cat);
                    categories.push({ id: item.cat, name: item.cat, icon: '🍽️' });
                }
            });
            populateCategorySelect();
        } catch (e) {
            console.error('Không thể tải thực đơn từ MySQL API:', e);
            menu = [];
        }

        updateStats();
        renderCategoryTabs();
        renderMenu();
    }

    function updateStats() {
        const total = menu.length;
        const available = menu.filter(m => m.status === 'available').length;
        const out = menu.filter(m => m.status === 'out_of_stock').length;
        const avgPrice = total > 0 ? Math.round(menu.reduce((sum, m) => sum + Number(m.price || 0), 0) / total) : 0;

        const statTotal = document.getElementById('statTotalDishes');
        const statActive = document.getElementById('statActiveDishes');
        const statOut = document.getElementById('statOutDishes');
        const statAvg = document.getElementById('statAvgPrice');

        if (statTotal) statTotal.textContent = total;
        if (statActive) statActive.textContent = available;
        if (statOut) statOut.textContent = out;
        if (statAvg) statAvg.textContent = formatVND(avgPrice);
    }

    function renderCategoryTabs() {
        if (!catTabsContainer) return;
        catTabsContainer.innerHTML = categories.map(cat => {
            const count = cat.id === 'all' ? menu.length : menu.filter(m => m.cat === cat.id).length;
            const active = currentCategory === cat.id ? 'active' : '';
            return `
                <button type="button" class="filter-tab ${active}" data-cat="${cat.id}">
                    <span>${cat.icon}</span>
                    <span>${cat.name}</span>
                    <span style="opacity:0.75; font-size:12px; margin-left:4px;">(${count})</span>
                </button>
            `;
        }).join('');

        catTabsContainer.querySelectorAll('.filter-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                currentCategory = btn.getAttribute('data-cat');
                renderCategoryTabs();
                renderMenu();
            });
        });
    }

    function getFilteredMenu() {
        return menu.filter(item => {
            const matchCat = currentCategory === 'all' || item.cat === currentCategory;
            const matchSearch = !searchQuery ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.id.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCat && matchSearch;
        });
    }

    function renderMenu() {
        const filtered = getFilteredMenu();

        if (tableContainer) {
            if (filtered.length === 0) {
                tableContainer.innerHTML = `
                    <tr>
                        <td colspan="6" style="padding: 48px 20px; text-align: center; color: var(--muted);">
                            <div style="font-size: 36px; margin-bottom: 8px;">🍽️</div>
                            <div style="font-weight: 700; font-size: 16px; color: var(--text);">Không tìm thấy món ăn nào</div>
                            <p style="font-size: 13px; margin-top: 4px;">Thực đơn hiện tại chưa có món trong cơ sở dữ liệu MySQL. Nhấn nút <strong>"+ Thêm món"</strong> để bắt đầu kinh doanh.</p>
                        </td>
                    </tr>
                `;
            } else {
                tableContainer.innerHTML = filtered.map(item => {
                    const isAvailable = item.status === 'available';
                    return `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:14px 20px; font-family:monospace; font-weight:700; color:var(--primary);">${item.id}</td>
                            <td style="padding:14px 20px;">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <span style="font-size:22px;">${item.emoji}</span>
                                    <strong style="font-size:14.5px; color:var(--text);">${item.name}</strong>
                                </div>
                            </td>
                            <td style="padding:14px 20px;">
                                <span class="badge" style="background:#f1f5f9; color:#475569; font-weight:600;">${getCategoryDisplay(item.cat)}</span>
                            </td>
                            <td style="padding:14px 20px; font-weight:700; color:var(--text);">${formatVND(item.price)}</td>
                            <td style="padding:14px 20px;">
                                <span class="badge ${isAvailable ? 'badge-success' : 'badge-danger'}">
                                    ${isAvailable ? '● Đang bán' : '✕ Hết hàng'}
                                </span>
                            </td>
                            <td style="padding:14px 20px; text-align:right;">
                                <div style="display:inline-flex; align-items:center; gap:8px;">
                                    <button type="button" class="btn-toggle-stock btn-ghost" data-id="${item.realId || item.id}" style="padding:6px 12px; font-size:12.5px; font-weight:600; cursor:pointer;">
                                        ${isAvailable ? 'Báo hết' : 'Mở bán'}
                                    </button>
                                    <button type="button" class="action-icon-btn btn-edit-dish" data-id="${item.id}" title="Sửa món" style="cursor:pointer;">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        if (gridContainer) {
            if (filtered.length === 0) {
                gridContainer.innerHTML = `
                    <div style="grid-column: 1 / -1; padding: 48px; text-align: center; color: var(--muted); background: var(--card); border-radius: 12px; border: 1px dashed var(--border);">
                        <div style="font-size: 36px; margin-bottom: 8px;">🍽️</div>
                        <div style="font-weight: 700; font-size: 16px;">Không tìm thấy món ăn nào</div>
                        <p style="font-size: 13px; margin-top: 4px;">Thử chọn danh mục khác hoặc thêm món mới vào Database.</p>
                    </div>
                `;
            } else {
                gridContainer.innerHTML = filtered.map(item => {
                    const isAvailable = item.status === 'available';
                    return `
                        <div class="dish-card ${isAvailable ? '' : 'is-out-of-stock'}">
                            <div class="dish-card-header">
                                <span class="dish-emoji">${item.emoji}</span>
                                <span class="badge ${isAvailable ? 'badge-success' : 'badge-danger'}">
                                    ${isAvailable ? '● Đang bán' : '✕ Hết hàng'}
                                </span>
                            </div>
                            <div class="dish-card-body">
                                <span class="dish-code">${item.id}</span>
                                <h3 class="dish-name">${item.name}</h3>
                                <div class="dish-price">${formatVND(item.price)}</div>
                            </div>
                            <div class="dish-card-footer">
                                <button type="button" class="btn-toggle-stock" data-id="${item.realId || item.id}">
                                    ${isAvailable ? 'Báo hết hàng' : 'Mở bán lại'}
                                </button>
                                <button type="button" class="action-icon-btn btn-edit-dish" data-id="${item.id}" title="Sửa món">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        bindEvents();
    }

    function bindEvents() {
        document.querySelectorAll('.btn-toggle-stock').forEach(btn => {
            btn.onclick = async () => {
                const id = btn.getAttribute('data-id');
                try {
                    if (window.API) {
                        await window.API.patch(`/products/${id}/toggle-status`);
                    } else {
                        await fetch(`http://localhost:8080/api/v1/products/${id}/toggle-status`, { method: 'PATCH' });
                    }
                    await loadMenu();
                } catch (e) {
                    alert('Lỗi cập nhật trạng thái món: ' + e.message);
                }
            };
        });

        document.querySelectorAll('.btn-edit-dish').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                openEditModal(id);
            };
        });
    }

    function openEditModal(dishId) {
        if (dishId) {
            const dish = menu.find(m => m.id === dishId);
            if (!dish) return;
            modalTitle.textContent = 'Chỉnh sửa món ăn';
            editingIdInput.value = dish.realId || dish.id;
            document.getElementById('dishId').value = dish.id;
            document.getElementById('dishId').disabled = true;
            document.getElementById('dishName').value = dish.name;
            document.getElementById('dishCat').value = dish.cat;
            document.getElementById('dishPrice').value = dish.price;
            document.getElementById('dishEmoji').value = dish.emoji || '🍽️';
            document.getElementById('dishStatus').value = dish.status;
        } else {
            modalTitle.textContent = 'Thêm món mới vào thực đơn';
            editingIdInput.value = '';
            document.getElementById('dishId').value = 'm' + (menu.length + 1).toString().padStart(2, '0');
            document.getElementById('dishId').disabled = false;
            document.getElementById('dishName').value = '';
            document.getElementById('dishCat').value = 'hot';
            document.getElementById('dishPrice').value = '';
            document.getElementById('dishEmoji').value = '🍲';
            document.getElementById('dishStatus').value = 'available';
        }
        modal.classList.add('active');
    }

    function closeModal() {
        if (modal) modal.classList.remove('active');
    }

    // Modal Events
    const addBtn = document.getElementById('btnAddDish');
    const closeBtn = document.getElementById('closeDishModal');
    const cancelBtn = document.getElementById('cancelDishBtn');

    if (addBtn) addBtn.onclick = () => openEditModal(null);
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    if (dishForm) {
        dishForm.onsubmit = async (e) => {
            e.preventDefault();
            const editId = editingIdInput.value;
            const code = document.getElementById('dishId').value.trim();
            const name = document.getElementById('dishName').value.trim();
            const cat = document.getElementById('dishCat').value;
            const price = parseFloat(document.getElementById('dishPrice').value) || 0;
            const emoji = document.getElementById('dishEmoji').value.trim() || '🍽️';
            const status = document.getElementById('dishStatus').value;
            const branchId = await resolveBranchId();

            const payload = {
                code,
                name,
                category: cat,
                price,
                emoji,
                status,
                stockQuantity: 100,
                branchId: branchId || 1
            };

            try {
                if (editId) {
                    if (window.API) {
                        await window.API.put(`/products/${editId}`, payload);
                    } else {
                        await fetch(`http://localhost:8080/api/v1/products/${editId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    }
                } else {
                    if (window.API) {
                        await window.API.post('/products', payload);
                    } else {
                        await fetch('http://localhost:8080/api/v1/products', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    }
                }
                closeModal();
                await loadMenu();
            } catch (err) {
                alert('Lỗi lưu món ăn vào Database: ' + err.message);
            }
        };
    }

    if (searchInput) {
        searchInput.oninput = (e) => {
            searchQuery = e.target.value.trim();
            renderMenu();
        };
    }

    // Tải dữ liệu ban đầu
    loadMenu();
})();
