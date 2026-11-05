// ChainPoint — Quản lý Đơn hàng Chi nhánh (Kèm thông tin Tích & Dùng điểm Loyalty)
// Used by: pages/branch/orders.html

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

    // Mock initial completed orders if pos.history is empty
    const DEFAULT_HISTORY = [
        {
            billId: 'HD80000008',
            tableId: 'A1',
            tableName: 'Bàn 01',
            customerName: 'Nguyễn Thị Minh Hằng',
            phone: '0901234567',
            staff: 'Thu ngân 01 (Thảo)',
            items: [
                { id: 'm01', name: 'Bò lúc lắc', price: 129000, qty: 1 },
                { id: 'm11', name: 'Coca-Cola', price: 20000, qty: 1 },
                { id: 'm24', name: 'Khăn lạnh', price: 3000, qty: 1 }
            ],
            total: 152000,
            pointsUsed: 0,
            discountVND: 0,
            pointsEarned: 15,
            paidAmount: 152000,
            method: 'cash',
            status: 'paid',
            paidAt: '2026-11-02T11:42:00Z'
        },
        {
            billId: 'HD80000007',
            tableId: 'A3',
            tableName: 'Bàn 03',
            customerName: 'Lê Văn Hoàng',
            phone: '0912345678',
            staff: 'Thu ngân 01 (Thảo)',
            items: [
                { id: 'm02', name: 'Gà nướng mật ong', price: 119000, qty: 1 },
                { id: 'm07', name: 'Salad Caesar', price: 69000, qty: 1 },
                { id: 'm12', name: 'Trà đào cam sả', price: 45000, qty: 2 }
            ],
            total: 278000,
            pointsUsed: 20, // 20 điểm = 20.000 ₫
            discountVND: 20000,
            pointsEarned: 25,
            paidAmount: 258000,
            method: 'transfer',
            status: 'paid',
            paidAt: '2026-11-02T10:05:00Z'
        },
        {
            billId: 'HD80000006',
            tableId: 'B2',
            tableName: 'Bàn 2.2',
            customerName: 'Phạm Thu Trang',
            phone: '0988776655',
            staff: 'Thu ngân 02 (Long)',
            items: [
                { id: 'm06', name: 'Lẩu thái hải sản', price: 289000, qty: 1 },
                { id: 'm05', name: 'Tôm rang muối', price: 139000, qty: 1 }
            ],
            total: 428000,
            pointsUsed: 40,
            discountVND: 40000,
            pointsEarned: 38,
            paidAmount: 388000,
            method: 'transfer',
            status: 'paid',
            paidAt: '2026-11-01T20:15:00Z'
        },
        {
            billId: 'HD80000005',
            tableId: 'C1',
            tableName: 'Vườn 01',
            customerName: 'Khách vãng lai',
            phone: '—',
            staff: 'Thu ngân 01 (Thảo)',
            items: [
                { id: 'm04', name: 'Mì Ý hải sản', price: 99000, qty: 2 },
                { id: 'm13', name: 'Cà phê sữa đá', price: 35000, qty: 2 }
            ],
            total: 268000,
            pointsUsed: 0,
            discountVND: 0,
            pointsEarned: 0,
            paidAmount: 268000,
            method: 'cash',
            status: 'paid',
            paidAt: '2026-11-01T18:30:00Z'
        }
    ];

    function getAllOrders() {
        const activeOrders = read(K_ORDERS, {});
        const pendingOrders = read(K_PENDING, []);
        let historyOrders = read(K_HISTORY, null);

        if (!historyOrders || historyOrders.length === 0) {
            historyOrders = DEFAULT_HISTORY;
            localStorage.setItem(K_HISTORY, JSON.stringify(DEFAULT_HISTORY));
        }

        const list = [];

        // 1. Đang phục vụ tại bàn
        Object.values(activeOrders).forEach(o => {
            const total = (o.items || []).reduce((sum, i) => sum + i.price * i.qty, 0);
            list.push({
                billId: o.billId || 'HD-NEW',
                tableId: o.tableId,
                tableName: o.tableName || `Bàn ${o.tableId}`,
                customerName: o.customerName || 'Khách tại bàn',
                phone: o.customerPhone || '—',
                staff: o.staff || 'Thu ngân chi nhánh',
                items: o.items || [],
                total,
                pointsUsed: 0,
                pointsEarned: Math.floor(total / 10000),
                paidAmount: total,
                status: 'busy',
                statusLabel: 'Đang phục vụ',
                method: 'Chưa thanh toán',
                time: o.openedAt ? new Date(o.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa tạo'
            });
        });

        // 2. Chờ thanh toán
        pendingOrders.forEach(p => {
            const total = p.total || (p.items || []).reduce((sum, i) => sum + i.price * i.qty, 0);
            list.push({
                billId: p.billId,
                tableId: p.tableId,
                tableName: p.tableName || `Bàn ${p.tableId}`,
                customerName: p.customerName || 'Khách thanh toán',
                phone: p.customerPhone || '—',
                staff: p.staff || 'Thu ngân chi nhánh',
                items: p.items || [],
                total,
                pointsUsed: p.pointsUsed || 0,
                pointsEarned: Math.floor((total - (p.discountVND || 0)) / 10000),
                paidAmount: total - (p.discountVND || 0),
                status: 'pending',
                statusLabel: p.method === 'transfer' ? 'Chờ QR chuyển khoản' : 'Chờ tiền mặt',
                method: p.method === 'transfer' ? 'Chuyển khoản QR' : 'Tiền mặt',
                time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa tạo'
            });
        });

        // 3. Đã thanh toán
        historyOrders.forEach(h => {
            const total = h.total || (h.items || []).reduce((sum, i) => sum + i.price * i.qty, 0);
            const ptsUsed = h.pointsUsed || 0;
            const ptsEarned = h.pointsEarned ?? Math.floor((total - (h.discountVND || 0)) / 10000);
            list.push({
                billId: h.billId,
                tableId: h.tableId,
                tableName: h.tableName || `Bàn ${h.tableId}`,
                customerName: h.customerName || 'Khách vãng lai',
                phone: h.phone || '—',
                staff: h.staff || 'Thu ngân chi nhánh',
                items: h.items || [],
                total,
                pointsUsed: ptsUsed,
                pointsEarned: ptsEarned,
                paidAmount: h.paidAmount || (total - (h.discountVND || 0)),
                status: 'paid',
                statusLabel: 'Đã thanh toán',
                method: h.method === 'transfer' ? 'Chuyển khoản QR' : 'Tiền mặt',
                time: h.paidAt ? new Date(h.paidAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'
            });
        });

        return list;
    }

    let orders = getAllOrders();
    let currentFilter = 'all';
    let searchQuery = '';

    const tbody = document.getElementById('ordersTableBody');
    const searchInput = document.getElementById('orderSearchInput');
    const filterTabs = document.getElementById('orderFilterTabs');
    const detailModal = document.getElementById('orderDetailModal');

    function updateStats() {
        const paidOrders = orders.filter(o => o.status === 'paid');
        const revenue = paidOrders.reduce((sum, o) => sum + o.paidAmount, 0);
        const totalPointsUsed = paidOrders.reduce((sum, o) => sum + (o.pointsUsed || 0), 0);
        const totalPointsEarned = paidOrders.reduce((sum, o) => sum + (o.pointsEarned || 0), 0);
        const activeCount = orders.filter(o => o.status === 'busy' || o.status === 'pending').length;

        const statRev = document.getElementById('statTotalRevenue');
        const statCount = document.getElementById('statTotalOrders');
        const statPtsUsed = document.getElementById('statTotalPointsUsed');
        const statPtsEarned = document.getElementById('statTotalPointsEarned');

        if (statRev) statRev.textContent = formatVND(revenue);
        if (statCount) statCount.textContent = orders.length;
        if (statPtsUsed) statPtsUsed.textContent = `${totalPointsUsed} pts (${formatVND(totalPointsUsed * 1000)})`;
        if (statPtsEarned) statPtsEarned.textContent = `+${totalPointsEarned} pts`;
    }

    function renderOrders() {
        if (!tbody) return;

        const filtered = orders.filter(o => {
            const matchFilter = currentFilter === 'all' || o.status === currentFilter;
            const matchSearch = !searchQuery ||
                o.billId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.phone.includes(searchQuery);
            return matchFilter && matchSearch;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:40px; color:var(--muted);">
                        Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(o => {
            const isPaid = o.status === 'paid';
            const isBusy = o.status === 'busy';
            const statusBadge = isPaid
                ? `<span style="background:#ecfdf5; color:#059669; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700;">✓ ${o.statusLabel}</span>`
                : isBusy
                ? `<span style="background:#eff6ff; color:#2563eb; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700;">🍽️ ${o.statusLabel}</span>`
                : `<span style="background:#fffbeb; color:#d97706; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700;">⏳ ${o.statusLabel}</span>`;

            return `
                <tr>
                    <td style="font-family:monospace; font-weight:800; color:var(--primary);">${o.billId}</td>
                    <td style="font-size:13px; color:var(--muted);">${o.time}</td>
                    <td>
                        <div style="font-weight:700; color:var(--text);">${o.customerName}</div>
                        <small style="color:var(--muted); font-size:12px;">SĐT: ${o.phone}</small>
                    </td>
                    <td>
                        <span style="background:#f1f5f9; color:#334155; font-weight:700; padding:3px 8px; border-radius:6px; font-size:12.5px;">
                            ${o.tableName}
                        </span>
                    </td>
                    <td style="font-size:13px; color:#475569;">${o.staff}</td>
                    <td style="font-weight:800; color:var(--text);">${formatVND(o.paidAmount)}</td>
                    <td>
                        ${o.pointsUsed > 0
                            ? `<span style="color:#e11d48; font-weight:700; font-size:12.5px;">-${o.pointsUsed} pts (-${formatVND(o.pointsUsed * 1000)})</span>`
                            : `<span style="color:#94a3b8; font-size:12px;">0</span>`}
                    </td>
                    <td>
                        ${o.pointsEarned > 0
                            ? `<span style="color:#059669; font-weight:700; font-size:12.5px;">+${o.pointsEarned} pts</span>`
                            : `<span style="color:#94a3b8; font-size:12px;">0</span>`}
                    </td>
                    <td>${statusBadge}</td>
                    <td style="text-align:right;">
                        <button type="button" class="btn-view-order" data-id="${o.billId}" style="background:#eef4ff; color:var(--primary); border:0; padding:6px 12px; border-radius:8px; font-weight:700; font-size:12.5px; cursor:pointer;">
                            Chi tiết
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach view detail click
        document.querySelectorAll('.btn-view-order').forEach(btn => {
            btn.onclick = () => {
                const billId = btn.getAttribute('data-id');
                const target = orders.find(o => o.billId === billId);
                if (target) showDetail(target);
            };
        });
    }

    function showDetail(o) {
        if (!detailModal) return;
        document.getElementById('modalBillId').textContent = o.billId;
        document.getElementById('modalCustName').textContent = o.customerName;
        document.getElementById('modalCustPhone').textContent = o.phone;
        document.getElementById('modalStaff').textContent = o.staff;
        document.getElementById('modalTable').textContent = o.tableName;
        document.getElementById('modalMethod').textContent = o.method;
        document.getElementById('modalTime').textContent = o.time;

        const itemsHtml = o.items.map(i => `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #e2e8f0; font-size:13.5px;">
                <div>
                    <strong>${i.name}</strong> × ${i.qty}
                    ${i.note ? `<div style="font-size:12px; color:var(--muted);">📝 ${i.note}</div>` : ''}
                </div>
                <div style="font-weight:700;">${formatVND(i.price * i.qty)}</div>
            </div>
        `).join('');
        document.getElementById('modalItemsList').innerHTML = itemsHtml || '<div style="color:var(--muted);">Không có món</div>';

        document.getElementById('modalGrossTotal').textContent = formatVND(o.total);
        document.getElementById('modalDiscount').textContent = o.pointsUsed > 0 ? `-${formatVND(o.pointsUsed * 1000)} (${o.pointsUsed} điểm)` : '0 ₫';
        document.getElementById('modalNetTotal').textContent = formatVND(o.paidAmount);
        document.getElementById('modalEarned').textContent = `+${o.pointsEarned} điểm`;

        detailModal.classList.add('active');
    }

    // Modal Close
    const closeBtn = document.getElementById('closeOrderModal');
    if (closeBtn) closeBtn.onclick = () => detailModal.classList.remove('active');

    // Filter tabs
    if (filterTabs) {
        filterTabs.querySelectorAll('.filter-tab').forEach(btn => {
            btn.onclick = () => {
                filterTabs.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.getAttribute('data-status');
                renderOrders();
            };
        });
    }

    // Search
    if (searchInput) {
        searchInput.oninput = (e) => {
            searchQuery = e.target.value.trim();
            renderOrders();
        };
    }

    updateStats();
    renderOrders();
})();

