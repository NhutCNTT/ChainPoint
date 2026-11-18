// ChainPoint — Báo cáo Doanh thu Chi nhánh
// Kết nối trực tiếp với MySQL Backend API thay thế hoàn toàn mock data

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
                const res = await window.API.fetch(`http://localhost:8080/api/v1${endpoint}`);
                history = await res.json();
            }
        } catch (e) {
            console.warn('Không thể nạp dữ liệu hóa đơn từ MySQL API:', e);
            history = [];
        }

        renderRevenueReport(history.filter(bill => bill.status === 'paid'));
    }

    function renderRevenueReport(history) {
        let totalNet = 0;
        let totalCash = 0;
        let totalTransfer = 0;
        let totalLoyaltyDiscount = 0;
        let loyaltyOrdersCount = 0;

        const itemSales = {};

        history.forEach(h => {
            const paid = Number(h.finalAmount || h.paidAmount || h.grossAmount || 0);
            const discount = Number(h.discountAmount || 0);

            totalNet += paid;
            totalLoyaltyDiscount += discount;
            if (discount > 0 || (h.pointsUsed && h.pointsUsed > 0)) {
                loyaltyOrdersCount++;
            }

            if (h.paymentMethod === 'transfer') {
                totalTransfer += paid;
            } else {
                totalCash += paid;
            }

            (h.items || []).forEach(item => {
                const name = item.productName || item.name;
                const unitPrice = Number(item.unitPrice || item.price || 0);
                const qty = Number(item.quantity || item.qty || 1);
                const subtotal = Number(item.subtotal || (unitPrice * qty));

                if (!itemSales[name]) {
                    itemSales[name] = { qty: 0, revenue: 0, unitPrice: unitPrice };
                }
                itemSales[name].qty += qty;
                itemSales[name].revenue += subtotal;
                if (!itemSales[name].unitPrice && unitPrice > 0) {
                    itemSales[name].unitPrice = unitPrice;
                }
            });
        });

        // 4 Stat Cards
        const statNet = document.getElementById('statNetRevenue');
        const statCash = document.getElementById('statCashRevenue');
        const statTransfer = document.getElementById('statTransferRevenue');
        const statLoyalty = document.getElementById('statLoyaltyDiscount');

        if (statNet) statNet.textContent = formatVND(totalNet);
        if (statCash) statCash.textContent = formatVND(totalCash);
        if (statTransfer) statTransfer.textContent = formatVND(totalTransfer);
        if (statLoyalty) statLoyalty.textContent = formatVND(totalLoyaltyDiscount);

        // Payment Breakdown percentages
        const totalPayments = totalTransfer + totalCash;
        const transferPct = totalPayments > 0 ? Math.round((totalTransfer / totalPayments) * 100) : 0;
        const cashPct = totalPayments > 0 ? (100 - transferPct) : 0;

        const transferPercentEl = document.getElementById('transferPercent');
        const transferBarEl = document.getElementById('transferBar');
        const cashPercentEl = document.getElementById('cashPercent');
        const cashBarEl = document.getElementById('cashBar');

        if (transferPercentEl) transferPercentEl.textContent = transferPct + '%';
        if (transferBarEl) transferBarEl.style.width = transferPct + '%';
        if (cashPercentEl) cashPercentEl.textContent = cashPct + '%';
        if (cashBarEl) cashBarEl.style.width = cashPct + '%';

        // Loyalty Insight
        const loyaltyInsightText = document.getElementById('loyaltyInsightText');
        if (loyaltyInsightText) {
            if (history.length === 0) {
                loyaltyInsightText.textContent = 'Chưa có dữ liệu giao dịch từ cơ sở dữ liệu MySQL.';
            } else if (loyaltyOrdersCount === 0) {
                loyaltyInsightText.textContent = `Đã có ${history.length} đơn hàng. Chưa có khách hàng nào quy đổi điểm tích lũy trên hóa đơn.`;
            } else {
                loyaltyInsightText.innerHTML = `Đã có <strong>${loyaltyOrdersCount}</strong> đơn hàng áp dụng điểm hội viên, tổng giá trị giảm trừ đạt <strong>${formatVND(totalLoyaltyDiscount)}</strong>.`;
            }
        }

        // Top 5 món bán chạy (5 cột: #, Tên món, Đơn giá, Số lượng, Doanh số)
        const topBody = document.getElementById('topSellingBody');
        if (topBody) {
            const sorted = Object.entries(itemSales).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
            if (sorted.length === 0) {
                topBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 32px; color: var(--muted);"><div style="font-size:28px; margin-bottom:6px;">🍽️</div>Chưa có đơn hàng nào được thanh toán.</td></tr>`;
            } else {
                topBody.innerHTML = sorted.map(([name, data], idx) => {
                    const priceDisplay = data.unitPrice > 0 ? formatVND(data.unitPrice) : formatVND(Math.round(data.revenue / data.qty));
                    return `
                        <tr>
                            <td style="padding:10px 8px;"><strong>#${idx + 1}</strong></td>
                            <td style="padding:10px 8px; font-weight:600;">${name}</td>
                            <td style="padding:10px 8px; color:var(--muted);">${priceDisplay}</td>
                            <td style="padding:10px 8px;"><span class="badge badge-primary">${data.qty} suất</span></td>
                            <td style="padding:10px 8px; text-align:right; font-weight:700; color:var(--text);">${formatVND(data.revenue)}</td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }

    loadRevenueReport();
})();
