// ChainPoint — Quản trị Chương trình Khách hàng thân thiết Loyalty (Mô hình Bách Hóa Xanh)
// Used by: pages/branch/loyalty.html

(function () {
    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    // Elements
    const statMembers = document.getElementById('statTotalMembers');
    const statIssued = document.getElementById('statTotalIssued');
    const statRedeemed = document.getElementById('statTotalRedeemed');
    const statCirculating = document.getElementById('statCirculating');

    const topMembersBody = document.getElementById('topMembersBody');
    const txBody = document.getElementById('loyaltyTxBody');
    const configForm = document.getElementById('loyaltyConfigForm');
    const saveNotice = document.getElementById('configSaveNotice');

    function renderStats() {
        const custs = LoyaltyStore.getCustomers();
        const txs = LoyaltyStore.getTransactions();

        const totalMembers = custs.length;
        const totalCirculating = custs.reduce((s, c) => s + (c.points || 0), 0);

        let issued = 0;
        let redeemed = 0;

        txs.forEach(t => {
            if (t.points > 0) issued += t.points;
            else if (t.points < 0) redeemed += Math.abs(t.points);
        });

        if (statMembers) statMembers.textContent = totalMembers;
        if (statIssued) statIssued.textContent = `+${issued} pts (${formatVND(issued * 1000)})`;
        if (statRedeemed) statRedeemed.textContent = `-${redeemed} pts (${formatVND(redeemed * 1000)})`;
        if (statCirculating) statCirculating.textContent = `${totalCirculating} pts (${formatVND(totalCirculating * 1000)})`;
    }

    function renderTopMembers() {
        if (!topMembersBody) return;
        const custs = [...LoyaltyStore.getCustomers()].sort((a, b) => (b.points || 0) - (a.points || 0));

        topMembersBody.innerHTML = custs.slice(0, 5).map((c, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            return `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="font-size:18px; text-align:center; font-weight:800; width:50px;">${medal}</td>
                    <td>
                        <div style="font-weight:700; color:var(--text); font-size:14px;">${c.name}</div>
                        <small style="color:var(--muted); font-size:12px;">SĐT: ${c.phone}</small>
                    </td>
                    <td>
                        <span style="font-weight:700; font-size:12px; color:#475569;">${c.tier}</span>
                    </td>
                    <td style="font-weight:800; color:var(--text);">${formatVND(c.totalSpent)}</td>
                    <td style="text-align:right; font-weight:800; color:#059669; font-size:15px;">
                        ${c.points} <small style="font-size:11px; color:var(--muted); font-weight:600;">pts</small>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderTransactions() {
        if (!txBody) return;
        const txs = LoyaltyStore.getTransactions();

        if (txs.length === 0) {
            txBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:30px; color:var(--muted);">Chưa có lịch sử giao dịch điểm.</td>
                </tr>
            `;
            return;
        }

        txBody.innerHTML = txs.map(t => {
            const isEarn = t.points > 0;
            const badge = isEarn
                ? `<span style="background:#ecfdf5; color:#059669; font-weight:700; font-size:12px; padding:3px 8px; border-radius:999px;">+${t.typeLabel}</span>`
                : `<span style="background:#fff1f2; color:#e11d48; font-weight:700; font-size:12px; padding:3px 8px; border-radius:999px;">-${t.typeLabel}</span>`;

            return `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="font-family:monospace; font-weight:700; color:var(--primary); font-size:13px;">${t.txId}</td>
                    <td style="font-size:12.5px; color:var(--muted);">${t.createdAt}</td>
                    <td>
                        <div style="font-weight:700; font-size:13.5px; color:var(--text);">${t.customerName}</div>
                        <small style="color:var(--muted); font-size:12px;">${t.phone}</small>
                    </td>
                    <td>${badge}</td>
                    <td style="font-weight:800; font-size:14px; color:${isEarn ? '#059669' : '#e11d48'};">
                        ${isEarn ? `+${t.points}` : t.points} pts
                        <div style="font-size:11px; font-weight:500; color:var(--muted);">${formatVND(Math.abs(t.points) * 1000)}</div>
                    </td>
                    <td style="font-family:monospace; font-size:13px; color:#475569;">${t.billId || '—'}</td>
                    <td style="font-size:12.5px; color:#475569;">${t.staff || 'Hệ thống'}</td>
                    <td style="font-size:12px; color:var(--muted); max-width:200px;">${t.note || ''}</td>
                </tr>
            `;
        }).join('');
    }

    function loadConfigForm() {
        if (!configForm) return;
        const cfg = LoyaltyStore.getConfig();

        document.getElementById('earnRatioVND').value = cfg.earnRatioVND || 10000;
        document.getElementById('pointValueVND').value = cfg.pointValueVND || 1000;
        document.getElementById('minPointsToRedeem').value = cfg.minPointsToRedeem || 5;
        document.getElementById('maxDiscountPercent').value = cfg.maxDiscountPercent || 50;
        document.getElementById('pointExpiryDays').value = cfg.pointExpiryDays || 365;
        document.getElementById('allowRedeem').checked = cfg.allowRedeem !== false;
        document.getElementById('allowEarn').checked = cfg.allowEarn !== false;
    }

    if (configForm) {
        configForm.onsubmit = (e) => {
            e.preventDefault();
            const newCfg = {
                earnRatioVND: parseInt(document.getElementById('earnRatioVND').value, 10) || 10000,
                pointValueVND: parseInt(document.getElementById('pointValueVND').value, 10) || 1000,
                minPointsToRedeem: parseInt(document.getElementById('minPointsToRedeem').value, 10) || 5,
                maxDiscountPercent: parseInt(document.getElementById('maxDiscountPercent').value, 10) || 50,
                pointExpiryDays: parseInt(document.getElementById('pointExpiryDays').value, 10) || 365,
                allowRedeem: document.getElementById('allowRedeem').checked,
                allowEarn: document.getElementById('allowEarn').checked
            };

            LoyaltyStore.saveConfig(newCfg);
            renderStats();

            if (saveNotice) {
                saveNotice.style.display = 'block';
                setTimeout(() => { saveNotice.style.display = 'none'; }, 3000);
            }
        };
    }

    // Init
    renderStats();
    renderTopMembers();
    renderTransactions();
    loadConfigForm();
})();

