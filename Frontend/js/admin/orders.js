// ChainPoint — Quản lý & tra cứu đơn hàng (Phục vụ Thu ngân, Quản lý, Chủ chuỗi)
// Used by: pages/admin/orders.html

(function () {
    const K_ORDERS = 'pos.orders';
    const K_PENDING = 'pos.pending';
    const K_HISTORY = 'pos.history';

    function read(k, fallback) {
        try {
            const v = JSON.parse(localStorage.getItem(k));
            return v ?? fallback;
        } catch {
            return fallback;
        }
    }

    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    function getAllOrders() {
        const activeOrders = read(K_ORDERS, {});
        const pendingOrders = read(K_PENDING, []);
        const historyOrders = read(K_HISTORY, []);

        const list = [];

        // 1. Đang phục vụ tại bàn
        Object.values(activeOrders).forEach(o => {
            const total = (o.items || []).reduce((sum, i) => sum + i.price * i.qty, 0);
            list.push({
                billId: o.billId || 'HD-NEW',
                tableId: o.tableId,
                items: o.items || [],
                total,
                status: 'busy',
                statusLabel: 'Đang phục vụ',
                method: '—',
                time: o.openedAt ? new Date(o.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa tạo'
            });
        });

        // 2. Chờ thanh toán (Tạm tính / Chờ chuyển khoản)
        pendingOrders.forEach(p => {
            const total = p.total || (p.items || []).reduce((sum, i) => sum + i.price * i.qty, 0);
            list.push({
                billId: p.billId,
                tableId: p.tableId,
                items: p.items || [],
                total,
                status: 'pending',
                statusLabel: p.method === 'transfer' ? 'Chờ QR chuyển khoản' : 'Chờ thanh toán',
                method: p.method === 'transfer' ? 'Chuyển khoản' : 'Tạm tính',
                time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa tạo'
            });
        });

        // 3. Đã thanh toán hoàn tất
        historyOrders.forEach(h => {
            const total = h.total || (h.items || []).reduce((sum, i) => sum + i.price * i.qty, 0);
            list.push({
                billId: h.billId,
                tableId: h.tableId,
                items: h.items || [],
                total,
                status: 'paid',
                statusLabel: 'Đã thanh toán',
                method: h.method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt',
                time: h.paidAt ? new Date(h.paidAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—',
                received: h.received,
                change: h.change
            });
        });

        return list;
    }

    let orders = getAllOrders();
    let currentStatusFilter = 'all';
    let currentSearch = '';

    const ordersTableBody = document.getElementById('ordersTableBody');
    const searchInput = document.getElementById('orderSearchInput');
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

    // Stats
    const statTotalRevenue = document.getElementById('statTotalRevenue');
    const statTotalBills = document.getElementById('statTotalBills');
    const statPendingBills = document.getElementById('statPendingBills');
    const statActiveTables = document.getElementById('statActiveTables');

    function updateStats() {
        const paidOrders = orders.filter(o => o.status === 'paid');
        const revenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const pendingCount = orders.filter(o => o.status === 'pending').length;
        const busyCount = orders.filter(o => o.status === 'busy').length;

        if (statTotalRevenue) statTotalRevenue.textContent = formatVND(revenue);
        if (statTotalBills) statTotalBills.textContent = orders.length;
        if (statPendingBills) statPendingBills.textContent = pendingCount;
        if (statActiveTables) statActiveTables.textContent = busyCount;
    }

    function filterOrders() {
        return orders.filter(o => {
            if (currentStatusFilter !== 'all' && o.status !== currentStatusFilter) {
                return false;
            }
            const q = currentSearch.toLowerCase().trim();
            if (q) {
                const matchId = o.billId.toLowerCase().includes(q);
                const matchTable = o.tableId.toLowerCase().includes(q);
                return matchId || matchTable;
            }
            return true;
        });
    }

    function render() {
        updateStats();
        const filtered = filterOrders();

        if (!ordersTableBody) return;
        if (filtered.length === 0) {
            ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 48px 20px; color: var(--muted);">
                        <div style="font-size: 32px; margin-bottom: 8px;">🧾</div>
                        <div style="font-size: 15px; font-weight: 700; color: var(--text);">Không tìm thấy đơn hàng nào</div>
                        <div style="font-size: 13px; margin-top: 4px;">Tạo đơn mới hoặc thực hiện thanh toán tại trang POS.</div>
                    </td>
                </tr>
            `;
            return;
        }

        ordersTableBody.innerHTML = filtered.map(o => {
            let statusBadge = '';
            if (o.status === 'paid') {
                statusBadge = `<span class="badge badge-success">✓ Đã thanh toán</span>`;
            } else if (o.status === 'pending') {
                statusBadge = `<span class="badge badge-warning">⏳ Chờ thanh toán</span>`;
            } else {
                statusBadge = `<span class="badge badge-primary">🍽️ Đang phục vụ</span>`;
            }

            return `
                <tr data-id="${o.billId}">
                    <td><strong>#${o.billId}</strong></td>
                    <td>
                        <span class="badge badge-primary" style="font-size: 13px;">Bàn ${o.tableId}</span>
                    </td>
                    <td style="font-size: 13.5px; color: var(--muted);">${o.time}</td>
                    <td>
                        <span style="font-size: 13.5px; font-weight: 600;">${o.items.length} món</span>
                        <small style="color: var(--muted); display: block; font-size: 11.5px;">(${o.items.reduce((s, i) => s + i.qty, 0)} sản phẩm)</small>
                    </td>
                    <td style="font-weight: 800; font-size: 14.5px; color: var(--text);">${formatVND(o.total)}</td>
                    <td>
                        <span style="font-size: 13px; font-weight: 600;">${o.method}</span>
                    </td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">
                        <button class="btn-secondary btn-view-bill" data-id="${o.billId}" style="padding: 6px 14px; font-size: 12.5px;" type="button">
                            Chi tiết hóa đơn
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        bindActions();
    }

    function bindActions() {
        document.querySelectorAll('.btn-view-bill').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const bill = orders.find(o => o.billId === id);
                if (bill) openBillModal(bill);
            });
        });
    }

    function openBillModal(bill) {
        billModalId.textContent = '#' + bill.billId;
        billModalTable.textContent = 'Bàn ' + bill.tableId;
        billModalTime.textContent = bill.time;
        billModalStatus.textContent = bill.statusLabel;
        billModalMethod.textContent = bill.method;
        billModalTotal.textContent = formatVND(bill.total);

        billModalItems.innerHTML = bill.items.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13.5px;">
                <div>
                    <strong style="color: var(--text);">${item.name}</strong>
                    ${item.note ? `<small style="display:block; color:#f59e0b; font-size:12px;">Ghi chú: ${item.note}</small>` : ''}
                </div>
                <div style="text-align: right;">
                    <span style="color: var(--muted);">${item.qty} × ${formatVND(item.price)}</span>
                    <strong style="display: block; color: var(--text); margin-top: 2px;">${formatVND(item.price * item.qty)}</strong>
                </div>
            </div>
        `).join('');

        billDetailModal.classList.add('is-open');
    }

    function closeBillModal() {
        billDetailModal.classList.remove('is-open');
    }

    const closeBillModalBtn = document.getElementById('closeBillModalBtn');
    const closeBillBtn = document.getElementById('closeBillBtn');
    if (closeBillModalBtn) closeBillModalBtn.addEventListener('click', closeBillModal);
    if (closeBillBtn) closeBillBtn.addEventListener('click', closeBillModal);
    if (billDetailModal) {
        billDetailModal.addEventListener('click', (e) => {
            if (e.target === billDetailModal) closeBillModal();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            render();
        });
    }

    if (statusTabs) {
        statusTabs.querySelectorAll('.filter-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                statusTabs.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStatusFilter = btn.dataset.status;
                render();
            });
        });
    }

    render();
})();

