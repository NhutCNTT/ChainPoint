// ChainPoint — Quản lý Đơn hàng Chi nhánh
// Kết nối trực tiếp với MySQL Backend API & Quyền hoàn tiền Quản lý (Manager/Owner)

(function () {
    let ordersList = [];
    let currentStatusFilter = 'all';
    let searchQuery = '';

    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    const tbody = document.getElementById('ordersTableBody');
    const filterTabsContainer = document.getElementById('orderFilterTabs');
    const searchInput = document.getElementById('orderSearchInput');

    // Stats
    const statTotalOrders = document.getElementById('statTotalOrders');
    const statTotalRevenue = document.getElementById('statTotalRevenue');
    const statTotalPointsUsed = document.getElementById('statTotalPointsUsed');
    const statTotalPointsEarned = document.getElementById('statTotalPointsEarned');

    // Modal elements
    const detailModal = document.getElementById('orderDetailModal');
    const closeOrderModal = document.getElementById('closeOrderModal');

    function checkIsManagerOrOwner() {
        const role = (sessionStorage.getItem('cp_role') || '').toLowerCase();
        return role.includes('manager') || role.includes('owner');
    }

    async function loadOrders() {
        try {
            const branchId = sessionStorage.getItem('cp_branch_id') || '';
            const endpoint = branchId ? `/orders?branchId=${branchId}` : '/orders';

            let data;
            if (window.API) {
                data = await window.API.get(endpoint);
            } else {
                const res = await window.API.fetch(`http://localhost:8080/api/v1${endpoint}`);
                data = await res.json();
            }

            ordersList = data.map(b => ({
                billId: b.billCode,
                tableId: b.tableCode,
                tableName: `Bàn ${b.tableCode}`,
                customerName: b.customerName || 'Khách vãng lai',
                phone: b.customerPhone || '—',
                staff: b.cashierUsername || 'Thu ngân',
                items: (b.items || []).map(i => ({
                    id: i.productId,
                    name: i.productName,
                    price: i.unitPrice,
                    qty: i.quantity,
                    subtotal: i.subtotal
                })),
                grossAmount: b.grossAmount,
                discountVND: b.discountAmount || 0,
                pointsUsed: b.pointsUsed || 0,
                pointsEarned: b.pointsEarned || 0,
                paidAmount: b.finalAmount,
                status: b.status || 'paid',
                statusLabel: b.status === 'paid' ? 'Đã thanh toán' : (b.status === 'refunded' ? 'Đã hoàn tiền' : 'Đang xử lý'),
                method: b.paymentMethod === 'transfer' ? 'Chuyển khoản VietQR' : 'Tiền mặt',
                billHash: b.billHash,
                blockchainTxHash: b.blockchainTxHash,
                createdAt: b.createdAt,
                time: b.createdAt ? new Date(b.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay'
            }));
        } catch (e) {
            console.error('Không thể tải đơn hàng từ MySQL API:', e);
            ordersList = [];
        }

        updateStats();
        render();
    }

    function updateStats() {
        const total = ordersList.length;
        const paid = ordersList.filter(o => o.status === 'paid');
        const revenue = paid.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0);
        const totalUsed = ordersList.reduce((sum, o) => sum + Number(o.pointsUsed || 0), 0);
        const totalEarned = ordersList.reduce((sum, o) => sum + Number(o.pointsEarned || 0), 0);

        if (statTotalOrders) statTotalOrders.textContent = total;
        if (statTotalRevenue) statTotalRevenue.textContent = formatVND(revenue);
        if (statTotalPointsUsed) statTotalPointsUsed.textContent = totalUsed + ' pts';
        if (statTotalPointsEarned) statTotalPointsEarned.textContent = totalEarned + ' pts';
    }

    function getFilteredOrders() {
        return ordersList.filter(o => {
            const matchStatus = currentStatusFilter === 'all' || o.status === currentStatusFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchSearch = !q ||
                o.billId.toLowerCase().includes(q) ||
                o.tableName.toLowerCase().includes(q) ||
                o.customerName.toLowerCase().includes(q) ||
                o.phone.includes(q);
            return matchStatus && matchSearch;
        });
    }

    function render() {
        if (!tbody) return;
        const filtered = getFilteredOrders();
        const isManager = checkIsManagerOrOwner();

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="padding: 48px; text-align: center; color: var(--muted);">
                        <div style="font-size: 32px; margin-bottom: 8px;">🧾</div>
                        <div style="font-weight: 700; font-size: 15px;">Chưa có đơn hàng nào trong Database</div>
                        <p style="font-size: 13px; margin-top: 4px;">Thực hiện thanh toán đơn hàng trên POS để đồng bộ dữ liệu vào MySQL.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(o => {
            const isPaid = o.status === 'paid';
            const isRefunded = o.status === 'refunded';

            let statusBadge = `<span class="badge badge-warning">⚡ ${o.statusLabel}</span>`;
            if (isPaid) {
                statusBadge = `<span class="badge badge-success">✓ Đã thanh toán</span>`;
            } else if (isRefunded) {
                statusBadge = `<span class="badge badge-danger">↩ Đã hoàn tiền</span>`;
            }

            const pointsUsedBadge = o.pointsUsed > 0
                ? `<span style="color: #ef4444; font-weight:700;">-${o.pointsUsed} pts</span>`
                : '—';

            const pointsEarnedBadge = o.pointsEarned > 0
                ? `<span style="color: #10b981; font-weight:700;">+${o.pointsEarned} pts</span>`
                : '—';

            let actionButtons = `
                <div style="display:flex; justify-content:flex-end; gap:6px;">
                    <button class="action-icon-btn btn-view-detail" data-id="${o.billId}" title="Xem chi tiết">
                        👁️
                    </button>
            `;

            if (isPaid) {
                if (isManager) {
                    actionButtons += `
                        <button class="btn btn-sm btn-refund" data-id="${o.billId}" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:4px 8px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer;" title="Quản lý hoàn tiền">
                            ↩ Hoàn tiền
                        </button>
                    `;
                } else {
                    actionButtons += `
                        <button class="btn btn-sm" disabled style="opacity:0.5; background:#f1f5f9; color:#94a3b8; border:1px solid #cbd5e1; padding:4px 8px; border-radius:6px; font-size:11px;" title="Chỉ Quản lý mới được hoàn tiền">
                            🔒 Hoàn tiền
                        </button>
                    `;
                }
            } else if (isRefunded) {
                actionButtons += `
                    <span style="font-size:11px; color:#ef4444; font-weight:600; padding:4px 0;">Đã hoàn trả</span>
                `;
            }

            actionButtons += `</div>`;

            return `
                <tr>
                    <td><code>${o.billId}</code></td>
                    <td><small style="color:var(--muted);">${o.time}</small></td>
                    <td>
                        <div style="font-weight: 600;">${o.customerName}</div>
                        <div style="font-size: 11px; color: var(--muted);">${o.phone}</div>
                    </td>
                    <td><strong>${o.tableName}</strong></td>
                    <td><small>${o.staff}</small></td>
                    <td>
                        <div style="font-weight: 800; color: var(--primary);">${formatVND(o.paidAmount)}</div>
                        <div style="font-size: 10.5px; color: var(--muted);">${o.method}</div>
                    </td>
                    <td>${pointsUsedBadge}</td>
                    <td>${pointsEarnedBadge}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align:right;">${actionButtons}</td>
                </tr>
            `;
        }).join('');

        bindTableEvents();
    }

    function bindTableEvents() {
        document.querySelectorAll('.btn-view-detail').forEach(btn => {
            btn.onclick = () => {
                const billId = btn.getAttribute('data-id');
                openDetailModal(billId);
            };
        });

        document.querySelectorAll('.btn-refund').forEach(btn => {
            btn.onclick = async () => {
                const billId = btn.getAttribute('data-id');
                await handleRefund(billId);
            };
        });
    }

    async function handleRefund(billId) {
        if (!checkIsManagerOrOwner()) {
            alert('🚫 QUYỀN BỊ TỪ CHỐI:\nChỉ Quản lý (Manager) hoặc Chủ nhà hàng (Owner) mới có quyền hoàn tiền hóa đơn!');
            return;
        }

        const reason = prompt(`⚠️ XÁC NHẬN HOÀN TIỀN CHO HÓA ĐƠN #${billId}\n\nVui lòng nhập lý do hoàn tiền (VD: Khách đổi món, lỗi phục vụ, hủy đơn):`, 'Khách hủy món / sự cố phục vụ');
        if (!reason || !reason.trim()) {
            return;
        }

        const confirmed = confirm(`Bạn có chắc chắn muốn HOÀN TIỀN hóa đơn #${billId}?\n\n• Điểm đã dùng sẽ hoàn trả lại cho khách\n• Điểm đã tích sẽ được thu hồi\n• Tồn kho món ăn sẽ được tự động cộng lại vào cơ sở dữ liệu MySQL\n• Giao dịch sẽ được ghi vết trên Blockchain Smart Contract`);
        if (!confirmed) return;

        try {
            const payload = {
                managerUsername: sessionStorage.getItem('cp_user') || 'manager',
                reason: reason.trim()
            };

            let result;
            if (window.API) {
                result = await window.API.post(`/orders/${billId}/refund`, payload);
            } else {
                const res = await window.API.fetch(`http://localhost:8080/api/v1/orders/${billId}/refund`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.message || 'Lỗi hoàn tiền');
                }
                result = await res.json();
            }

            alert(`✅ HOÀN TIỀN THÀNH CÔNG!\n\n• Mã đơn: ${result.billCode}\n• Tiền hoàn lại: ${formatVND(result.actualRefundAmount)}\n• Điểm hoàn trả: +${result.pointsRestored} pts\n• Điểm thu hồi: -${result.pointsRevoked} pts\n• Người duyệt: ${result.processedBy || 'Quản lý'}\n• Blockchain Tx: ${result.blockchainTxHash ? result.blockchainTxHash.substring(0, 16) + '...' : 'Ghi nhận sổ cái'}`);

            await loadOrders();
        } catch (err) {
            console.error('Lỗi khi hoàn tiền:', err);
            alert('❌ Không thể hoàn tiền: ' + (err.message || err));
        }
    }

    function openDetailModal(billId) {
        const order = ordersList.find(o => o.billId === billId);
        if (!order || !detailModal) return;

        document.getElementById('modalBillId').textContent = '#' + order.billId;
        document.getElementById('modalTime').textContent = order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—';
        document.getElementById('modalCustName').textContent = order.customerName;
        document.getElementById('modalCustPhone').textContent = order.phone;
        document.getElementById('modalTable').textContent = order.tableName;
        document.getElementById('modalStaff').textContent = order.staff;
        document.getElementById('modalMethod').textContent = order.method;

        const itemsContainer = document.getElementById('modalItemsList');
        if (itemsContainer) {
            itemsContainer.innerHTML = order.items.map(item => `
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #e2e8f0; font-size:13.5px;">
                    <div><strong>${item.name}</strong> × ${item.qty}</div>
                    <div style="font-weight:700;">${formatVND(item.subtotal || (item.price * item.qty))}</div>
                </div>
            `).join('');
        }

        document.getElementById('modalGrossTotal').textContent = formatVND(order.grossAmount || order.paidAmount);
        document.getElementById('modalDiscount').textContent = order.discountVND > 0 ? `-${formatVND(order.discountVND)} (${order.pointsUsed} pts)` : '0 ₫';
        document.getElementById('modalNetTotal').textContent = formatVND(order.paidAmount);
        document.getElementById('modalEarned').textContent = order.pointsEarned > 0 ? `+${order.pointsEarned} điểm (Loyalty CPL)` : '0 điểm';

        detailModal.classList.add('active');
    }

    function closeDetail() {
        if (detailModal) detailModal.classList.remove('active');
    }

    if (closeOrderModal) closeOrderModal.onclick = closeDetail;
    if (detailModal) {
        detailModal.onclick = (e) => {
            if (e.target === detailModal) closeDetail();
        };
    }

    if (filterTabsContainer) {
        filterTabsContainer.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabsContainer.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentStatusFilter = tab.dataset.status || 'all';
                render();
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            render();
        });
    }

    loadOrders();
})();
