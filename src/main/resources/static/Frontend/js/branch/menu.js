// ChainPoint — Quản lý Thực đơn (Menu) Chi nhánh
// Used by: pages/branch/menu.html

(function () {
    const STORAGE_KEY = 'cp_branch_menu';

    const CATEGORIES = [
        { id: 'all', name: 'Tất cả danh mục', icon: '✨' },
        { id: 'hot', name: 'Món nóng', icon: '🔥' },
        { id: 'cold', name: 'Món lạnh', icon: '🥗' },
        { id: 'drink', name: 'Đồ uống', icon: '🥤' },
        { id: 'dessert', name: 'Tráng miệng', icon: '🍰' },
        { id: 'other', name: 'Món ăn kèm', icon: '🍚' }
    ];

    const DEFAULT_MENU = [
        { id: 'm01', cat: 'hot', name: 'Bò lúc lắc', price: 129000, emoji: '🥩', status: 'available', soldCount: 342 },
        { id: 'm02', cat: 'hot', name: 'Gà nướng mật ong', price: 119000, emoji: '🍗', status: 'available', soldCount: 289 },
        { id: 'm03', cat: 'hot', name: 'Cá hồi áp chảo', price: 169000, emoji: '🐟', status: 'available', soldCount: 154 },
        { id: 'm04', cat: 'hot', name: 'Mì Ý hải sản', price: 99000, emoji: '🍝', status: 'available', soldCount: 412 },
        { id: 'm05', cat: 'hot', name: 'Tôm rang muối', price: 139000, emoji: '🍤', status: 'available', soldCount: 198 },
        { id: 'm06', cat: 'hot', name: 'Lẩu thái hải sản', price: 289000, emoji: '🍲', status: 'available', soldCount: 88 },
        { id: 'm07', cat: 'cold', name: 'Salad Caesar', price: 69000, emoji: '🥗', status: 'available', soldCount: 260 },
        { id: 'm08', cat: 'cold', name: 'Gỏi cuốn tôm thịt', price: 55000, emoji: '🌯', status: 'available', soldCount: 310 },
        { id: 'm09', cat: 'cold', name: 'Gỏi ngó sen', price: 79000, emoji: '🥬', status: 'available', soldCount: 175 },
        { id: 'm10', cat: 'cold', name: 'Sashimi cá hồi', price: 159000, emoji: '🍣', status: 'out_of_stock', soldCount: 95 },
        { id: 'm11', cat: 'drink', name: 'Coca-Cola', price: 20000, emoji: '🥤', status: 'available', soldCount: 620 },
        { id: 'm12', cat: 'drink', name: 'Trà đào cam sả', price: 45000, emoji: '🍑', status: 'available', soldCount: 480 },
        { id: 'm13', cat: 'drink', name: 'Cà phê sữa đá', price: 35000, emoji: '☕', status: 'available', soldCount: 390 },
        { id: 'm14', cat: 'drink', name: 'Nước ép cam', price: 42000, emoji: '🍊', status: 'available', soldCount: 210 },
        { id: 'm15', cat: 'drink', name: 'Sinh tố bơ', price: 48000, emoji: '🥑', status: 'available', soldCount: 165 },
        { id: 'm16', cat: 'drink', name: 'Bia Tiger', price: 30000, emoji: '🍺', status: 'available', soldCount: 540 },
        { id: 'm17', cat: 'dessert', name: 'Bánh flan caramel', price: 29000, emoji: '🍮', status: 'available', soldCount: 230 },
        { id: 'm18', cat: 'dessert', name: 'Kem 3 vị', price: 39000, emoji: '🍨', status: 'available', soldCount: 195 },
        { id: 'm19', cat: 'dessert', name: 'Tiramisu', price: 59000, emoji: '🍰', status: 'available', soldCount: 140 },
        { id: 'm20', cat: 'dessert', name: 'Trái cây theo mùa', price: 65000, emoji: '🍉', status: 'out_of_stock', soldCount: 110 },
        { id: 'm21', cat: 'other', name: 'Cơm trắng', price: 10000, emoji: '🍚', status: 'available', soldCount: 780 },
        { id: 'm22', cat: 'other', name: 'Khoai tây chiên', price: 49000, emoji: '🍟', status: 'available', soldCount: 350 },
        { id: 'm23', cat: 'other', name: 'Bánh mì bơ tỏi', price: 35000, emoji: '🥖', status: 'available', soldCount: 220 },
        { id: 'm24', cat: 'other', name: 'Khăn lạnh', price: 3000, emoji: '🧻', status: 'available', soldCount: 1200 }
    ];

    function loadMenu() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error(e);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MENU));
        return DEFAULT_MENU;
    }

    function saveMenu(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    let menu = loadMenu();
    let currentCategory = 'all';
    let searchQuery = '';

    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    // DOM Elements
    const gridContainer = document.getElementById('menuGridContainer');
    const tableContainer = document.getElementById('menuTableBody');
    const catTabsContainer = document.getElementById('categoryTabs');
    const searchInput = document.getElementById('menuSearchInput');
    const modal = document.getElementById('dishModal');
    const dishForm = document.getElementById('dishForm');
    const modalTitle = document.getElementById('dishModalTitle');
    const editingIdInput = document.getElementById('editingDishId');

    function updateStats() {
        const total = menu.length;
        const available = menu.filter(m => m.status === 'available').length;
        const out = menu.filter(m => m.status === 'out_of_stock').length;
        const avgPrice = total > 0 ? Math.round(menu.reduce((sum, m) => sum + m.price, 0) / total) : 0;

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
        catTabsContainer.innerHTML = CATEGORIES.map(cat => {
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
                        <td colspan="7" style="text-align:center; padding:40px; color:var(--muted);">
                            Không tìm thấy món ăn nào phù hợp với bộ lọc.
                        </td>
                    </tr>
                `;
            } else {
                tableContainer.innerHTML = filtered.map(item => {
                    const catObj = CATEGORIES.find(c => c.id === item.cat) || { name: item.cat, icon: '🍽️' };
                    const isAvailable = item.status === 'available';
                    return `
                        <tr>
                            <td style="font-weight:700; color:var(--primary); font-family:monospace;">#${item.id}</td>
                            <td>
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <span style="font-size:26px; width:40px; height:40px; background:#f1f5f9; border-radius:10px; display:grid; place-items:center;">${item.emoji || '🍽️'}</span>
                                    <div>
                                        <div style="font-weight:700; color:var(--text); font-size:14.5px;">${item.name}</div>
                                        <small style="color:var(--muted);">Đã bán: ${item.soldCount || 0} suất</small>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span style="background:#f1f5f9; color:#475569; padding:4px 10px; border-radius:999px; font-size:12.5px; font-weight:600;">
                                    ${catObj.icon} ${catObj.name}
                                </span>
                            </td>
                            <td style="font-weight:800; color:var(--text); font-size:15px;">${formatVND(item.price)}</td>
                            <td>
                                <button type="button" class="btn-toggle-stock" data-id="${item.id}" style="border:0; cursor:pointer; font-size:12px; font-weight:700; padding:4px 10px; border-radius:999px; background:${isAvailable ? '#ecfdf5' : '#fff1f2'}; color:${isAvailable ? '#059669' : '#e11d48'};">
                                    ${isAvailable ? '● Đang phục vụ' : '○ Tạm hết món'}
                                </button>
                            </td>
                            <td style="text-align:right;">
                                <div style="display:flex; justify-content:flex-end; gap:6px;">
                                    <button type="button" class="btn-edit-dish" data-id="${item.id}" style="background:#eef4ff; color:var(--primary); border:0; padding:6px 10px; border-radius:8px; font-weight:700; font-size:12.5px; cursor:pointer;">
                                        Sửa
                                    </button>
                                    <button type="button" class="btn-del-dish" data-id="${item.id}" style="background:#fee2e2; color:#dc2626; border:0; padding:6px 10px; border-radius:8px; font-weight:700; font-size:12.5px; cursor:pointer;">
                                        Xóa
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        attachActions();
    }

    function attachActions() {
        // Toggle stock
        document.querySelectorAll('.btn-toggle-stock').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const target = menu.find(m => m.id === id);
                if (target) {
                    target.status = target.status === 'available' ? 'out_of_stock' : 'available';
                    saveMenu(menu);
                    updateStats();
                    renderMenu();
                }
            };
        });

        // Edit
        document.querySelectorAll('.btn-edit-dish').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const target = menu.find(m => m.id === id);
                if (target) openEditModal(target);
            };
        });

        // Delete
        document.querySelectorAll('.btn-del-dish').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const target = menu.find(m => m.id === id);
                if (target && confirm(`Bạn có chắc muốn xóa món "${target.name}" khỏi thực đơn chi nhánh?`)) {
                    menu = menu.filter(m => m.id !== id);
                    saveMenu(menu);
                    updateStats();
                    renderCategoryTabs();
                    renderMenu();
                }
            };
        });
    }

    function openEditModal(dish = null) {
        if (!modal) return;
        if (dish) {
            modalTitle.textContent = 'Chỉnh sửa món ăn';
            editingIdInput.value = dish.id;
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
        dishForm.onsubmit = (e) => {
            e.preventDefault();
            const editId = editingIdInput.value;
            const id = document.getElementById('dishId').value.trim();
            const name = document.getElementById('dishName').value.trim();
            const cat = document.getElementById('dishCat').value;
            const price = parseInt(document.getElementById('dishPrice').value, 10) || 0;
            const emoji = document.getElementById('dishEmoji').value.trim() || '🍽️';
            const status = document.getElementById('dishStatus').value;

            if (editId) {
                const target = menu.find(m => m.id === editId);
                if (target) {
                    target.name = name;
                    target.cat = cat;
                    target.price = price;
                    target.emoji = emoji;
                    target.status = status;
                }
            } else {
                menu.unshift({
                    id: id || ('m' + (menu.length + 1)),
                    cat,
                    name,
                    price,
                    emoji,
                    status,
                    soldCount: 0
                });
            }

            saveMenu(menu);
            updateStats();
            renderCategoryTabs();
            renderMenu();
            closeModal();
        };
    }

    if (searchInput) {
        searchInput.oninput = (e) => {
            searchQuery = e.target.value.trim();
            renderMenu();
        };
    }

    // Init
    updateStats();
    renderCategoryTabs();
    renderMenu();
})();

