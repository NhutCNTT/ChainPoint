// ChainPoint — Quản lý Thực đơn (Menu) Chi nhánh
// Kết nối trực tiếp với MySQL Backend API thay thế hoàn toàn localStorage

(function () {
    const CATEGORIES = [
        { id: 'all', name: 'Tất cả danh mục', icon: '✨' },
        { id: 'hot', name: 'Món nóng', icon: '🔥' },
        { id: 'cold', name: 'Món lạnh', icon: '🥗' },
        { id: 'drink', name: 'Đồ uống', icon: '🥤' },
        { id: 'dessert', name: 'Tráng miệng', icon: '🍰' },
        { id: 'other', name: 'Món ăn kèm', icon: '🍚' }
    ];

    let products = [];
    let currentCategory = 'all';
    let searchQuery = '';

    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));

    const tableBody = document.getElementById('menuTableBody');
    const categoryTabs = document.getElementById('categoryTabs');
    const searchInput = document.getElementById('menuSearchInput');
    const addButton = document.getElementById('btnAddProduct');
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const modalTitle = document.getElementById('productModalTitle');
    const editingIdInput = document.getElementById('editingProductId');
    const codeInput = document.getElementById('productCode');
    const nameInput = document.getElementById('productName');
    const categoryInput = document.getElementById('productCategory');
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    const emojiInput = document.getElementById('productEmoji');
    const statusInput = document.getElementById('productStatus');
    const imageUrlInput = document.getElementById('productImageUrl');
    const saveButton = document.getElementById('saveProductBtn');
    const closeButton = document.getElementById('closeProductModal');
    const cancelButton = document.getElementById('cancelProductBtn');

    function toast(message, type) {
        if (window.showToast) {
            window.showToast(message, type || 'success');
        } else if (type === 'error') {
            alert(message);
        }
    }

    function getCategoryDisplay(categoryId) {
        const found = CATEGORIES.find(category => category.id === categoryId);
        return found ? `${found.icon} ${found.name}` : categoryId;
    }

    function generateNextCode() {
        const maxNumber = products.reduce((max, product) => {
            const match = String(product.code || '').match(/(\d+)$/);
            return match ? Math.max(max, Number(match[1])) : max;
        }, 0);
        return 'SP' + String(maxNumber + 1).padStart(3, '0');
    }

    async function loadProducts() {
        try {
            const data = await window.API.get('/products');
            products = (Array.isArray(data) ? data : []).map(product => ({
                realId: product.id,
                code: product.code || '',
                name: product.name || '',
                category: product.category || 'other',
                price: Number(product.price || 0),
                emoji: product.emoji || '🍽️',
                status: product.status || 'available',
                stockQuantity: Number(product.stockQuantity || 0),
                imageUrl: product.imageUrl || ''
            }));
        } catch (error) {
            console.error('Không thể tải thực đơn từ API:', error);
            products = [];
            toast('Không thể tải thực đơn: ' + error.message, 'error');
        }

        updateStats();
        renderCategoryTabs();
        renderTable();
    }

    function updateStats() {
        const total = products.length;
        const available = products.filter(product => product.status === 'available').length;
        const outOfStock = products.filter(product => product.status === 'out_of_stock').length;
        const averagePrice = total > 0
            ? Math.round(products.reduce((sum, product) => sum + product.price, 0) / total)
            : 0;

        const statTotal = document.getElementById('statTotalDishes');
        const statActive = document.getElementById('statActiveDishes');
        const statOut = document.getElementById('statOutDishes');
        const statAverage = document.getElementById('statAvgPrice');

        if (statTotal) statTotal.textContent = total;
        if (statActive) statActive.textContent = available;
        if (statOut) statOut.textContent = outOfStock;
        if (statAverage) statAverage.textContent = formatVND(averagePrice);
    }

    function renderCategoryTabs() {
        if (!categoryTabs) return;

        categoryTabs.innerHTML = CATEGORIES.map(category => {
            const count = category.id === 'all'
                ? products.length
                : products.filter(product => product.category === category.id).length;
            const active = currentCategory === category.id ? 'active' : '';

            return `
                <button type="button" class="filter-tab ${active}" data-cat="${category.id}">
                    <span>${category.icon}</span>
                    <span>${category.name}</span>
                    <span style="opacity:0.75; font-size:12px; margin-left:4px;">(${count})</span>
                </button>
            `;
        }).join('');

        categoryTabs.querySelectorAll('.filter-tab').forEach(button => {
            button.addEventListener('click', () => {
                currentCategory = button.getAttribute('data-cat');
                renderCategoryTabs();
                renderTable();
            });
        });
    }

    function getFilteredProducts() {
        const keyword = searchQuery.toLowerCase();

        return products.filter(product => {
            const matchCategory = currentCategory === 'all' || product.category === currentCategory;
            const matchSearch = !keyword
                || product.name.toLowerCase().includes(keyword)
                || product.code.toLowerCase().includes(keyword);
            return matchCategory && matchSearch;
        });
    }

    function renderProductVisual(product) {
        const emoji = escapeHtml(product.emoji || '🍽️');

        if (!product.imageUrl) {
            return `<span style="font-size:22px;">${emoji}</span>`;
        }

        return `
            <span style="position:relative; width:36px; height:36px; display:inline-grid; place-items:center; flex-shrink:0;">
                <span style="font-size:22px;">${emoji}</span>
                <img src="${escapeHtml(product.imageUrl)}" alt="" loading="lazy"
                     style="position:absolute; inset:0; width:36px; height:36px; border-radius:8px; object-fit:cover; background:#fff;"
                     onerror="this.remove()" />
            </span>
        `;
    }

    function renderTable() {
        if (!tableBody) return;

        const filtered = getFilteredProducts();

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 48px 20px; text-align: center; color: var(--muted);">
                        <div style="font-size: 36px; margin-bottom: 8px;">🍽️</div>
                        <div style="font-weight: 700; font-size: 16px; color: var(--text);">Không tìm thấy món ăn nào</div>
                        <p style="font-size: 13px; margin-top: 4px;">Thực đơn hiện tại chưa có món phù hợp. Nhấn nút <strong>"Thêm món"</strong> để tạo món mới.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filtered.map(product => {
            const isAvailable = product.status === 'available';

            return `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:14px 20px; font-family:monospace; font-weight:700; color:var(--primary);">${escapeHtml(product.code)}</td>
                    <td style="padding:14px 20px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            ${renderProductVisual(product)}
                            <strong style="font-size:14.5px; color:var(--text);">${escapeHtml(product.name)}</strong>
                        </div>
                    </td>
                    <td style="padding:14px 20px;">
                        <span class="badge" style="background:#f1f5f9; color:#475569; font-weight:600;">${getCategoryDisplay(product.category)}</span>
                    </td>
                    <td style="padding:14px 20px; font-weight:700; color:var(--text);">${formatVND(product.price)}</td>
                    <td style="padding:14px 20px;">
                        <span class="badge ${isAvailable ? 'badge-success' : 'badge-danger'}">
                            ${isAvailable ? '● Đang bán' : '✕ Hết hàng'}
                        </span>
                        <div style="font-size:11.5px; color:var(--muted); margin-top:4px;">Tồn kho: ${product.stockQuantity}</div>
                    </td>
                    <td style="padding:14px 20px; text-align:right;">
                        <div style="display:inline-flex; align-items:center; gap:8px;">
                            <button type="button" class="btn-ghost btn-sm btn-toggle-product" data-id="${product.realId}" title="${isAvailable ? 'Báo hết món' : 'Mở bán lại'}">
                                ${isAvailable ? 'Báo hết' : 'Mở bán'}
                            </button>
                            <button type="button" class="action-icon-btn btn-edit-product" data-id="${product.realId}" title="Sửa món">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button type="button" class="action-icon-btn danger btn-delete-product" data-id="${product.realId}" data-name="${escapeHtml(product.name)}" title="Xóa món">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        bindRowActions();
    }

    function bindRowActions() {
        document.querySelectorAll('.btn-edit-product').forEach(button => {
            button.addEventListener('click', () => {
                const product = products.find(item => String(item.realId) === button.getAttribute('data-id'));
                if (product) openEditModal(product);
            });
        });

        document.querySelectorAll('.btn-toggle-product').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.getAttribute('data-id');
                button.disabled = true;

                try {
                    await window.API.patch(`/products/${id}/toggle-status`);
                    toast('Đã cập nhật trạng thái phục vụ của món.');
                    await loadProducts();
                } catch (error) {
                    toast('Lỗi cập nhật trạng thái món: ' + error.message, 'error');
                } finally {
                    button.disabled = false;
                }
            });
        });

        document.querySelectorAll('.btn-delete-product').forEach(button => {
            button.addEventListener('click', async () => {
                const id = button.getAttribute('data-id');
                const name = button.getAttribute('data-name') || 'món này';

                if (!window.confirm(`Bạn có chắc chắn muốn xóa "${name}" khỏi thực đơn?`)) {
                    return;
                }

                button.disabled = true;

                try {
                    await window.API.delete(`/products/${id}`);
                    toast('Đã xóa món khỏi thực đơn.');
                    await loadProducts();
                } catch (error) {
                    toast('Lỗi xóa món: ' + error.message, 'error');
                } finally {
                    button.disabled = false;
                }
            });
        });
    }

    function openAddModal() {
        editingIdInput.value = '';
        modalTitle.textContent = 'Thêm món ăn mới';
        codeInput.value = generateNextCode();
        nameInput.value = '';
        categoryInput.value = 'hot';
        priceInput.value = '';
        stockInput.value = '100';
        emojiInput.value = '🍽️';
        statusInput.value = 'available';
        imageUrlInput.value = '';
        openModal();
        codeInput.focus();
        codeInput.select();
    }

    function openEditModal(product) {
        editingIdInput.value = product.realId;
        modalTitle.textContent = 'Chỉnh sửa: ' + product.name;
        codeInput.value = product.code;
        nameInput.value = product.name;
        categoryInput.value = product.category;
        priceInput.value = product.price;
        stockInput.value = product.stockQuantity;
        emojiInput.value = product.emoji;
        statusInput.value = product.status;
        imageUrlInput.value = product.imageUrl;
        openModal();
        nameInput.focus();
    }

    function openModal() {
        if (modal) modal.classList.add('is-open');
    }

    function closeModal() {
        if (modal) modal.classList.remove('is-open');
    }

    if (form) {
        form.addEventListener('submit', async event => {
            event.preventDefault();

            const editingId = editingIdInput.value;
            const payload = {
                code: codeInput.value.trim(),
                name: nameInput.value.trim(),
                category: categoryInput.value,
                price: parseFloat(priceInput.value),
                emoji: emojiInput.value.trim(),
                status: statusInput.value,
                stockQuantity: parseInt(stockInput.value, 10),
                imageUrl: imageUrlInput.value.trim()
            };

            if (!payload.code || !payload.name) {
                toast('Vui lòng nhập mã món và tên món.', 'error');
                return;
            }

            if (!Number.isFinite(payload.price) || payload.price <= 0) {
                toast('Giá bán phải là số lớn hơn 0.', 'error');
                priceInput.focus();
                return;
            }

            if (!Number.isInteger(payload.stockQuantity) || payload.stockQuantity < 0) {
                toast('Số lượng tồn kho phải là số nguyên không âm.', 'error');
                stockInput.focus();
                return;
            }

            const originalText = saveButton ? saveButton.textContent : 'Lưu món ăn';
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = editingId ? 'Đang cập nhật...' : 'Đang thêm...';
            }

            try {
                if (editingId) {
                    await window.API.put(`/products/${editingId}`, payload);
                    toast('Đã cập nhật món ăn thành công.');
                } else {
                    await window.API.post('/products', payload);
                    toast('Đã thêm món ăn mới thành công.');
                }

                closeModal();
                await loadProducts();
            } catch (error) {
                toast('Lỗi lưu món ăn: ' + error.message, 'error');
            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = originalText;
                }
            }
        });
    }

    if (addButton) addButton.addEventListener('click', openAddModal);
    if (closeButton) closeButton.addEventListener('click', closeModal);
    if (cancelButton) cancelButton.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', event => {
            if (event.target === modal) closeModal();
        });
    }

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal && modal.classList.contains('is-open')) {
            closeModal();
        }
    });

    if (searchInput) {
        searchInput.addEventListener('input', event => {
            searchQuery = event.target.value.trim();
            renderTable();
        });
    }

    loadProducts();
})();
