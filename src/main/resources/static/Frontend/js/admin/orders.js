// ChainPoint — Quản lý & tra cứu đơn hàng (Phục vụ Thu ngân, Quản lý, Chủ chuỗi)
// Dữ liệu kết nối trực tiếp 100% với MySQL Backend API (không dùng mock data)

(function () {
    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    let orders = [];
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

    const API_BASE = (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '') 
        ? 'http://localhost:8080/api/v1' 
        : ((typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? `${window.location.origin}/api/v1` : 'http://localhost:8080/api/v1');

    async function loadOrdersFromDB() {
        try {
            const branchId = sessionStorage.getItem('cp_branch_id');
            const endpoint = branchId ? `${API_BASE}/orders?branchId=${branchId}` : `${API_BASE}/orders`;
            const res = await fetch(endpoint);
            if (res.ok) {
                const data = await res.json();
                orders = data.map(b => ({
                    billId: b.billCode,
                    tableId: b.tableCode,
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
                    time: b.createdAt ? new Date(b.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—',
                    billHash: b.billHash,
                    blockchainTxHash: b.blockchainTxHash
                }));
            } else {
                orders = [];
            }
        } catch (e) {
            console.warn('Không thể nạp danh sách hóa đơn từ MySQL API:', e);
            orders = [];
        }

        render();
    }

    function updateStats() {
        const paidOrders = orders.filter(o => o.status === 'paid');
        const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const pending = orders.filter(o => o.status === 'pending').length;

        if (statTotalRevenue) statTotalRevenue.textContent = formatVND(revenue);
        if (statTotalBills) statTotalBills.textContent = orders.length;
        if (statPendingBills) statPendingBills.textContent = pending;
        if (statActiveTables) statActiveTables.textContent = 0;
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

    function render() {
        updateStats();
        if (!ordersTableBody) return;

        const filtered = getFilteredOrders();

        if (filtered.length === 0) {
            ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 48px; color: var(--muted);">
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
            const statusBadge = o.status === 'paid'
                ? `<span class="badge badge-success">● Đã thanh toán</span>`
                : (o.status === 'refunded'
                    ? `<span class="badge badge-neutral" style="background:#fee2e2; color:#b91c1c;">↩ Đã hoàn tiền</span>`
                    : `<span class="badge badge-warning">⏳ Chờ xử lý</span>`);

            return `
                <tr>
                    <td><strong style="color: var(--primary); font-family: monospace;">${o.billId}</strong></td>
                    <td><span class="table-badge">Bàn ${o.tableId}</span></td>
                    <td>${itemCount} món</td>
                    <td style="font-weight: 800; color: var(--text);">${formatVND(o.total)}</td>
                    <td>${statusBadge}</td>
                    <td><span style="font-size: 13px; color: var(--muted);">${o.method}</span></td>
                    <td style="font-size: 12.5px; color: var(--muted);">${o.time}</td>
                </tr>
            `;
        }).join('');
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
