// ChainPoint — Báo cáo Doanh thu Chi nhánh
// Used by: pages/branch/revenue.html

(function () {
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

    // Mock initial data if empty
    const DEFAULT_HISTORY = [
        { billId: 'HD80000008', total: 152000, paidAmount: 152000, method: 'cash', discountVND: 0, pointsUsed: 0, pointsEarned: 15, paidAt: '2026-11-02T11:42:00Z', items: [{ name: 'Bò lúc lắc', price: 129000, qty: 1, cat: 'hot' }, { name: 'Coca-Cola', price: 20000, qty: 1, cat: 'drink' }] },
        { billId: 'HD80000007', total: 278000, paidAmount: 258000, method: 'transfer', discountVND: 20000, pointsUsed: 20, pointsEarned: 25, paidAt: '2026-11-02T10:05:00Z', items: [{ name: 'Gà nướng mật ong', price: 119000, qty: 1, cat: 'hot' }, { name: 'Salad Caesar', price: 69000, qty: 1, cat: 'cold' }, { name: 'Trà đào cam sả', price: 45000, qty: 2, cat: 'drink' }] },
        { billId: 'HD80000006', total: 428000, paidAmount: 388000, method: 'transfer', discountVND: 40000, pointsUsed: 40, pointsEarned: 38, paidAt: '2026-11-01T20:15:00Z', items: [{ name: 'Lẩu thái hải sản', price: 289000, qty: 1, cat: 'hot' }, { name: 'Tôm rang muối', price: 139000, qty: 1, cat: 'hot' }] },
        { billId: 'HD80000005', total: 268000, paidAmount: 268000, method: 'cash', discountVND: 0, pointsUsed: 0, pointsEarned: 0, paidAt: '2026-11-01T18:30:00Z', items: [{ name: 'Mì Ý hải sản', price: 99000, qty: 2, cat: 'hot' }, { name: 'Cà phê sữa đá', price: 35000, qty: 2, cat: 'drink' }] }
    ];

    function getHistory() {
        let history = read(K_HISTORY, null);
        if (!history || history.length === 0) {
            history = DEFAULT_HISTORY;
            localStorage.setItem(K_HISTORY, JSON.stringify(DEFAULT_HISTORY));
        }
        return history;
    }

    function renderRevenueReport() {
        const history = getHistory();

        let totalGross = 0;
        let totalNet = 0;
        let totalCash = 0;
        let totalTransfer = 0;
        let totalLoyaltyDiscount = 0;

        const itemSales = {};

        history.forEach(h => {
            const paid = h.paidAmount || h.total || 0;
            const gross = h.total || paid;
            const discount = h.discountVND || (h.pointsUsed ? h.pointsUsed * 1000 : 0);

            totalGross += gross;
            totalNet += paid;
            totalLoyaltyDiscount += discount;

            if (h.method === 'transfer') {
                totalTransfer += paid;
            } else {
                totalCash += paid;
            }

            (h.items || []).forEach(item => {
                if (!itemSales[item.name]) {
                    itemSales[item.name] = { name: item.name, qty: 0, revenue: 0, price: item.price };
                }
                itemSales[item.name].qty += item.qty;
                itemSales[item.name].revenue += item.price * item.qty;
            });
        });

        // Top KPIs
        const statNet = document.getElementById('statNetRevenue');
        const statCashEl = document.getElementById('statCashRevenue');
        const statTransferEl = document.getElementById('statTransferRevenue');
        const statLoyaltyEl = document.getElementById('statLoyaltyDiscount');

        if (statNet) statNet.textContent = formatVND(totalNet);
        if (statCashEl) statCashEl.textContent = formatVND(totalCash);
        if (statTransferEl) statTransferEl.textContent = formatVND(totalTransfer);
        if (statLoyaltyEl) statLoyaltyEl.textContent = formatVND(totalLoyaltyDiscount);

        // Top Selling items table
        const topBody = document.getElementById('topSellingBody');
        if (topBody) {
            const sortedItems = Object.values(itemSales).sort((a, b) => b.revenue - a.revenue);
            topBody.innerHTML = sortedItems.map((item, idx) => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="font-weight:800; color:var(--primary); font-size:14px; width:40px;">#${idx + 1}</td>
                    <td style="font-weight:700; color:var(--text); font-size:14px;">${item.name}</td>
                    <td style="font-weight:600; color:#475569;">${formatVND(item.price)}</td>
                    <td style="font-weight:800; color:var(--text);">${item.qty} suất</td>
                    <td style="font-weight:800; color:#059669; text-align:right;">${formatVND(item.revenue)}</td>
                </tr>
            `).join('');
        }
    }

    renderRevenueReport();
})();

