// ChainPoint — Quản lý & tra cứu đơn hàng (Phục vụ Thu ngân, Quản lý, Chủ chuỗi)
// Dữ liệu kết nối trực tiếp 100% với MySQL Backend API (không dùng mock data)

(async function () {
    await window.CP.ready;
    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';
    const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    let orders = [];
    let activeTablesCount = 0;
    let currentStatusFilter = 'all';
    let currentSearch = new URLSearchParams(location.search).get('q') || '';

    const ordersTableBody = document.getElementById('ordersTableBody');
    const searchInput = document.getElementById('orderSearchInput');
    if (searchInput) searchInput.value = currentSearch;
    const statusTabs = document.getElementById('orderStatusTabs');

    // Detail Modal elements
    const billDetailModal = document.getElementById('billDetailModal');
    const billModalId = document.getElementById('billModalId');
    const billModalTable = document.getElementById('billModalTable');
    const billModalTime = document.getElementById('billModalTime');
    const billModalStatus = document.getElementById('billModalStatus');
    const billModalItems = document.getElementById('billModalItems');
    const billModalTotal = document.getElementById('billModalTotal');
    const billModalMethod = document.getElementById('billModalMethod');
    const closeBillModalBtn = document.getElementById('closeBillModalBtn');
    const closeBillBtn = document.getElementById('closeBillBtn');

    // Stats
    const statTotalRevenue = document.getElementById('statTotalRevenue');
    const statTotalBills = document.getElementById('statTotalBills');
    const statPendingBills = document.getElementById('statPendingBills');
    const statActiveTables = document.getElementById('statActiveTables');

    async function loadOrdersFromDB() {
        const branchId = sessionStorage.getItem('cp_branch_id') || '';
        const qBranch = branchId ? `?branchId=${branchId}` : '';

        try {
            const data = await window.API.get(`/orders${qBranch}`);
            orders = (Array.isArray(data) ? data : []).map(b => ({
                    billId: b.billCode,
                    tableId: b.tableCode,
                    customerName: b.customerName || 'Khách vãng lai',
                    customerPhone: b.customerPhone || '—',
                    items: (b.items || []).map(i => ({
                        name: i.productName,
                        qty: i.quantity,
                        price: i.unitPrice,
                        subtotal: i.subtotal
                    })),
                    total: b.finalAmount || b.grossAmount || 0,
                    grossAmount: b.grossAmount || 0,
                    discountAmount: b.discountAmount || 0,
                    pointsUsed: b.pointsUsed || 0,
                    pointsEarned: b.pointsEarned || 0,
                    status: b.status || 'paid',
                    statusLabel: b.status === 'paid' ? 'Đã thanh toán' : (b.status === 'refunded' ? 'Đã hoàn tiền' : 'Chờ xử lý'),
                    method: b.paymentMethod === 'transfer' ? 'Chuyển khoản VietQR' : 'Tiền mặt',
                    time: b.createdAt ? new Date(b.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
                    billHash: b.billHash,
                    blockchainTxHash: b.blockchainTxHash
                }));
        } catch (e) {
            console.warn('Không thể nạp danh sách hóa đơn từ MySQL API:', e);
            orders = [];
        }

        // Nạp số lượng bàn đang hoạt động thực tế từ Database (/tables)
        try {
            const tables = await window.API.get(`/tables${qBranch}`);
            activeTablesCount = (Array.isArray(tables) ? tables : []).filter(t => t.status === 'active').length;
        } catch (ignored) {}

        render();
    }

    function updateStats() {
        const paidOrders = orders.filter(o => o.status === 'paid');
        const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const pending = orders.filter(o => o.status === 'pending').length;

        if (statTotalRevenue) statTotalRevenue.textContent = formatVND(revenue);
        if (statTotalBills) statTotalBills.textContent = orders.length;
        if (statPendingBills) statPendingBills.textContent = pending;
        if (statActiveTables) statActiveTables.textContent = activeTablesCount;
    }

    function getFilteredOrders() {
        return orders.filter(o => {
            const matchStatus = currentStatusFilter === 'all' || o.status === currentStatusFilter;
            const q = currentSearch.toLowerCase().trim();
            const matchSearch = !q ||
                (o.billId && o.billId.toLowerCase().includes(q)) ||
                (o.tableId && String(o.tableId).toLowerCase().includes(q)) ||
                (o.method && o.method.toLowerCase().includes(q));
            return matchStatus && matchSearch;
        });
    }

    function openBillDetailModal(billId) {
        const o = orders.find(x => x.billId === billId);
        if (!o || !billDetailModal) return;

        if (billModalId) billModalId.textContent = '#' + o.billId;
        if (billModalTime) billModalTime.textContent = o.time;
        if (billModalTable) billModalTable.textContent = 'Bàn ' + o.tableId;
        if (billModalMethod) billModalMethod.textContent = o.method;
        if (billModalStatus) billModalStatus.textContent = o.statusLabel;
        if (billModalTotal) billModalTotal.textContent = formatVND(o.total);

        if (billModalItems) {
            if (!o.items || o.items.length === 0) {
                billModalItems.innerHTML = `<div style="padding:12px 0; color:var(--muted);">Không có chi tiết món ăn.</div>`;
            } else {
                billModalItems.innerHTML = o.items.map(i => `
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #e2e8f0; font-size:13.5px;">
                        <div><strong>${escapeHtml(i.name)}</strong> × ${escapeHtml(i.qty)}</div>
                        <div style="font-weight:700;">${formatVND(i.subtotal || (i.price * i.qty))}</div>
                    </div>
                `).join('');
            }
        }

        billDetailModal.classList.add('is-open');
        billDetailModal.classList.add('active');
    }

    function closeBillModal() {
        if (!billDetailModal) return;
        billDetailModal.classList.remove('is-open');
        billDetailModal.classList.remove('active');
    }

    if (closeBillModalBtn) closeBillModalBtn.addEventListener('click', closeBillModal);
    if (closeBillBtn) closeBillBtn.addEventListener('click', closeBillModal);
    if (billDetailModal) {
        billDetailModal.addEventListener('click', (e) => {
            if (e.target === billDetailModal) closeBillModal();
        });
    }

    function render() {
        updateStats();
        if (!ordersTableBody) return;

        const filtered = getFilteredOrders();

        if (filtered.length === 0) {
            ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 48px; color: var(--muted);">
                        <div style="font-size: 32px; margin-bottom: 8px;">🧾</div>
                        <div style="font-weight: 700; font-size: 15px; color: var(--text);">Không có đơn hàng nào trong Cơ sở Dữ liệu</div>
                        <div style="font-size: 13px; margin-top: 4px;">Dữ liệu đơn hàng thực tế sẽ hiển thị tại đây khi máy POS tạo đơn và thanh toán.</div>
                    </td>
                </tr>
            `;
            return;
        }

        ordersTableBody.innerHTML = filtered.map(o => {
            const itemCount = (o.items || []).reduce((sum, i) => sum + (i.qty || 1), 0);
            const itemSummary = (o.items || []).slice(0, 2).map(i => `${i.name} (x${i.qty})`).join(', ') + ((o.items || []).length > 2 ? '...' : '');
            const statusBadge = o.status === 'paid'
                ? `<span class="badge badge-success">● Đã thanh toán</span>`
                : (o.status === 'refunded'
                    ? `<span class="badge badge-neutral" style="background:#fee2e2; color:#b91c1c;">↩ Đã hoàn tiền</span>`
                    : `<span class="badge badge-warning">⏳ Chờ xử lý</span>`);

            return `
                <tr>
                    <td><strong style="color: var(--primary); font-family: monospace;">${escapeHtml(o.billId)}</strong></td>
                    <td><span class="table-badge">Bàn ${escapeHtml(o.tableId)}</span></td>
                    <td style="font-size: 12.5px; color: var(--muted);">${escapeHtml(o.time)}</td>
                    <td>
                        <div style="font-weight: 600;">${itemCount} món</div>
                        <small style="color: var(--muted); font-size: 11.5px;">${escapeHtml(itemSummary || '—')}</small>
                    </td>
                    <td style="font-weight: 800; color: var(--text);">${formatVND(o.total)}</td>
                    <td><span style="font-size: 13px; color: var(--muted);">${escapeHtml(o.method)}</span></td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">
                        <button type="button" class="btn-secondary btn-view-bill" data-id="${escapeHtml(o.billId)}" style="padding: 6px 12px; font-size: 12px;">
                            Chi tiết
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        ordersTableBody.querySelectorAll('.btn-view-bill').forEach(btn => {
            btn.addEventListener('click', () => openBillDetailModal(btn.dataset.id));
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            render();
        });
    }

    if (statusTabs) {
        statusTabs.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                statusTabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentStatusFilter = tab.dataset.status;
                render();
            });
        });
    }

    loadOrdersFromDB();
})();
