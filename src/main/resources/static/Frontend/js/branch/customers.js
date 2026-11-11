// ChainPoint — Quản lý Khách hàng Chi nhánh (Tích hợp LoyaltyStore)
// Used by: pages/branch/customers.html

(function () {
    const currentBranch = sessionStorage.getItem('cp_branch') || localStorage.getItem('cp_branch') || 'Chi nhánh Quận 1';
    let searchQuery = '';

    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    const tbody = document.getElementById('customersTableBody');
    const searchInput = document.getElementById('customerSearchInput');
    const modal = document.getElementById('customerModal');
    const form = document.getElementById('customerForm');
    const modalTitle = document.getElementById('customerModalTitle');
    const historyModal = document.getElementById('customerHistoryModal');

    function updateStats() {
        const list = LoyaltyStore.getCustomers();
        const total = list.length;
        const totalSpent = list.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
        const totalPoints = list.reduce((sum, c) => sum + (c.points || 0), 0);
        const vipCount = list.filter(c => c.tier === 'Vàng' || c.tier === 'Kim Cương').length;

        const statTotal = document.getElementById('statTotalCustomers');
        const statSpent = document.getElementById('statTotalSpent');
        const statPoints = document.getElementById('statTotalPoints');
        const statVip = document.getElementById('statTotalVip');

        if (statTotal) statTotal.textContent = total;
        if (statSpent) statSpent.textContent = formatVND(totalSpent);
        if (statPoints) statPoints.textContent = `${totalPoints} pts`;
        if (statVip) statVip.textContent = vipCount;
    }

    function renderCustomers() {
        if (!tbody) return;
        const list = LoyaltyStore.getCustomers();

        const filtered = list.filter(c => {
            if (!searchQuery) return true;
            return c.phone.includes(searchQuery) ||
                   c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   c.id.toLowerCase().includes(searchQuery.toLowerCase());
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:40px; color:var(--muted);">
                        Không tìm thấy khách hàng nào khớp với tìm kiếm "${searchQuery}".
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(c => {
            const tierBadge = c.tier === 'Kim Cương'
                ? `<span style="background:#f5f3ff; color:#7c3aed; font-weight:800; padding:4px 10px; border-radius:999px; font-size:12px;">💎 Kim Cương</span>`
                : c.tier === 'Vàng'
                ? `<span style="background:#fefce8; color:#ca8a04; font-weight:800; padding:4px 10px; border-radius:999px; font-size:12px;">🥇 Vàng</span>`
                : `<span style="background:#f1f5f9; color:#475569; font-weight:700; padding:4px 10px; border-radius:999px; font-size:12px;">🥈 Bạc</span>`;

            return `
                <tr>
                    <td style="font-family:monospace; font-weight:800; color:var(--primary);">${c.id}</td>
                    <td>
                        <div style="font-weight:700; color:var(--text);">${c.name}</div>
                        <small style="color:var(--muted); font-size:12px;">Sinh nhật: ${c.dob || 'Chưa cập nhật'}</small>
                    </td>
                    <td style="font-weight:700; color:var(--text);">${c.phone}</td>
                    <td>${tierBadge}</td>
                    <td style="font-weight:800; color:#059669; font-size:15px;">
                        ${c.points} <small style="font-size:11px; font-weight:600; color:var(--muted);">= ${formatVND(c.points * 1000)}</small>
                    </td>
                    <td style="font-weight:800; color:var(--text);">${formatVND(c.totalSpent)}</td>
                    <td style="font-size:13px; color:var(--muted);">${c.joinedAt}</td>
                    <td style="text-align:right;">
                        <div style="display:flex; justify-content:flex-end; gap:6px;">
                            <button type="button" class="btn-history-cust" data-id="${c.id}" style="background:#ecfdf5; color:#059669; border:0; padding:6px 10px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;" title="Lịch sử giao dịch & điểm">
                                📜 Lịch sử
                            </button>
                            <button type="button" class="btn-edit-cust" data-id="${c.id}" style="background:#eef4ff; color:var(--primary); border:0; padding:6px 10px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;">
                                Sửa
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        attachEvents();
    }

    function attachEvents() {
        document.querySelectorAll('.btn-edit-cust').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const cust = LoyaltyStore.getCustomerById(id);
                if (cust) openCustomerModal(cust);
            };
        });

        document.querySelectorAll('.btn-history-cust').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const cust = LoyaltyStore.getCustomerById(id);
                if (cust) openHistoryModal(cust);
            };
        });
    }

    function openCustomerModal(cust = null) {
        if (!modal) return;
        if (cust) {
            modalTitle.textContent = 'Chỉnh sửa thông tin khách hàng';
            document.getElementById('custEditId').value = cust.id;
            document.getElementById('custName').value = cust.name;
            document.getElementById('custPhone').value = cust.phone;
            document.getElementById('custDob').value = cust.dob || '';
            document.getElementById('custPoints').value = cust.points || 0;
            document.getElementById('custTier').value = cust.tier || 'Bạc';
        } else {
            modalTitle.textContent = 'Thêm khách hàng thành viên mới';
            document.getElementById('custEditId').value = '';
            document.getElementById('custName').value = '';
            document.getElementById('custPhone').value = '';
            document.getElementById('custDob').value = '';
            document.getElementById('custPoints').value = 0;
            document.getElementById('custTier').value = 'Bạc';
        }
        modal.classList.add('active');
    }

    function closeCustomerModal() {
        if (modal) modal.classList.remove('active');
    }

    function openHistoryModal(cust) {
        if (!historyModal) return;
        document.getElementById('histCustName').textContent = cust.name;
        document.getElementById('histCustPhone').textContent = cust.phone;
        document.getElementById('histCustPoints').textContent = `${cust.points} điểm (${formatVND(cust.points * 1000)})`;
        document.getElementById('histCustSpent').textContent = formatVND(cust.totalSpent);

        // Load point transactions
        const allTx = LoyaltyStore.getTransactions();
        const custTx = allTx.filter(t => t.customerId === cust.id || t.phone === cust.phone);

        const listContainer = document.getElementById('histTxList');
        if (custTx.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted);">Chưa có phát sinh giao dịch điểm thưởng.</div>';
        } else {
            listContainer.innerHTML = custTx.map(t => {
                const isEarn = t.points > 0;
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px dashed #e2e8f0; font-size:13.5px;">
                        <div>
                            <div style="font-weight:700;">${t.typeLabel} <small style="color:var(--muted); font-size:12px;">(${t.txId})</small></div>
                            <div style="font-size:12px; color:var(--muted);">${t.createdAt} · ${t.note || ''}</div>
                        </div>
                        <div style="font-weight:800; font-size:14px; color:${isEarn ? '#059669' : '#e11d48'};">
                            ${isEarn ? `+${t.points}` : t.points} điểm
                        </div>
                    </div>
                `;
            }).join('');
        }

        historyModal.classList.add('active');
    }

    // Modal Events
    const addBtn = document.getElementById('btnAddCustomer');
    const closeBtn = document.getElementById('closeCustomerModal');
    const cancelBtn = document.getElementById('cancelCustomerBtn');
    const closeHistBtn = document.getElementById('closeHistoryModal');

    if (addBtn) addBtn.onclick = () => openCustomerModal(null);
    if (closeBtn) closeBtn.onclick = closeCustomerModal;
    if (cancelBtn) cancelBtn.onclick = closeCustomerModal;
    if (closeHistBtn) closeHistBtn.onclick = () => historyModal.classList.remove('active');

    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('custEditId').value;
            const name = document.getElementById('custName').value.trim();
            const phone = document.getElementById('custPhone').value.trim();
            const dob = document.getElementById('custDob').value;
            const points = parseInt(document.getElementById('custPoints').value, 10) || 0;
            const tier = document.getElementById('custTier').value;

            LoyaltyStore.saveCustomer({
                id,
                name,
                phone,
                dob,
                points,
                tier,
                branch: currentBranch
            });

            updateStats();
            renderCustomers();
            closeCustomerModal();
        };
    }

    if (searchInput) {
        searchInput.oninput = (e) => {
            searchQuery = e.target.value.trim();
            renderCustomers();
        };
    }

    updateStats();
    renderCustomers();
})();

