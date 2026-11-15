// ChainPoint — Báo cáo Doanh thu Chi nhánh
// Kết nối trực tiếp với MySQL Backend API thay thế hoàn toàn localStorage

(function () {
    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    async function loadRevenueReport() {
        const branchId = sessionStorage.getItem('cp_branch_id') || '';
        const endpoint = branchId ? `/orders?branchId=${branchId}` : '/orders';

        let history = [];
        try {
            if (window.API) {
                history = await window.API.get(endpoint);
            } else {
                const res = await fetch(`http://localhost:8080/api/v1${endpoint}`);
                history = await res.json();
            }
        } catch (e) {
            console.warn('Không thể nạp dữ liệu hóa đơn từ MySQL API:', e);
            history = [];
        }

        renderRevenueReport(history);
    }

    function renderRevenueReport(history) {
        let totalGross = 0;
        let totalNet = 0;
        let totalCash = 0;
        let totalTransfer = 0;
        let totalLoyaltyDiscount = 0;

        const itemSales = {};

        history.forEach(h => {
            const paid = Number(h.finalAmount || h.paidAmount || h.grossAmount || 0);
            const gross = Number(h.grossAmount || paid);
            const discount = Number(h.discountAmount || 0);

            totalGross += gross;
            totalNet += paid;
            totalLoyaltyDiscount += discount;

            if (h.paymentMethod === 'transfer') {
                totalTransfer += paid;
            } else {
                totalCash += paid;
            }

            (h.items || []).forEach(item => {
                const name = item.productName || item.name;
                if (!itemSales[name]) itemSales[name] = { qty: 0, revenue: 0 };
                itemSales[name].qty += (item.quantity || item.qty || 1);
                itemSales[name].revenue += (item.subtotal || ((item.unitPrice || item.price || 0) * (item.quantity || item.qty || 1)));
            });
        });

        const revGross = document.getElementById('revGross');
        const revNet = document.getElementById('revNet');
        const revCash = document.getElementById('revCash');
        const revTransfer = document.getElementById('revTransfer');
        const revLoyalty = document.getElementById('revLoyalty');
        const revOrdersCount = document.getElementById('revOrdersCount');

        if (revGross) revGross.textContent = formatVND(totalGross);
        if (revNet) revNet.textContent = formatVND(totalNet);
        if (revCash) revCash.textContent = formatVND(totalCash);
        if (revTransfer) revTransfer.textContent = formatVND(totalTransfer);
        if (revLoyalty) revLoyalty.textContent = formatVND(totalLoyaltyDiscount);
        if (revOrdersCount) revOrdersCount.textContent = history.length;

        // Top bán chạy
        const topBody = document.getElementById('topSellingBody');
        if (topBody) {
            const sorted = Object.entries(itemSales).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
            if (sorted.length === 0) {
                topBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 24px; color: var(--muted);">Chưa có đơn hàng nào được thanh toán.</td></tr>`;
            } else {
                topBody.innerHTML = sorted.map(([name, data], idx) => `
                    <tr>
                        <td><strong>#${idx + 1}</strong></td>
                        <td>${name}</td>
                        <td><span class="badge badge-primary">${data.qty} suất</span></td>
                        <td style="font-weight:700; color: var(--text);">${formatVND(data.revenue)}</td>
                    </tr>
                `).join('');
            }
        }
    }

    loadRevenueReport();
})();
