(async () => {
  await PayCommon.ready;
  const { bill, billId, loyaltyData } = PayCommon;
  if (!bill) return;

  const $ = (id) => document.getElementById(id);
  const input = $('received'), confirmBtn = $('btn-confirm-cash'), box = $('change-box');
  $('due-amount').textContent = UI.formatVND(bill.total);

  const parse = () => parseInt(input.value.replace(/\D/g, ''), 10) || 0;
  const setValue = (n) => { input.value = n ? n.toLocaleString('vi-VN') : ''; update(); };

  function update() {
    const received = parse();
    const diff = received - bill.total;
    box.classList.toggle('ok', received > 0 && diff >= 0);
    box.classList.toggle('short', received > 0 && diff < 0);
    if (!received) { $('change-label').textContent = 'Tiền thối khách'; $('change-amount').textContent = UI.formatVND(0); }
    else if (diff >= 0) { $('change-label').textContent = 'Tiền thối khách'; $('change-amount').textContent = UI.formatVND(diff); }
    else { $('change-label').textContent = 'Còn thiếu'; $('change-amount').textContent = UI.formatVND(-diff); }
    confirmBtn.disabled = !(received >= bill.total && bill.total >= 0);
  }

  // Gợi ý mệnh giá: "Đủ tiền" + các mệnh giá làm tròn lên cao hơn tổng
  const denoms = [50000, 100000, 200000, 500000];
  const suggest = [...new Set([bill.total, ...denoms.map((d) => Math.ceil(bill.total / d) * d)])].slice(0, 5);
  $('quick').innerHTML = suggest.map((v, i) =>
    `<button id="quick-${i}" class="btn" type="button" data-v="${v}">${i === 0 ? 'Đủ tiền' : UI.formatVND(v)}</button>`).join('');
  $('quick').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) setValue(+b.dataset.v); });

  input.addEventListener('input', () => setValue(parse()));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !confirmBtn.disabled) confirmBtn.click(); });
  $('btn-cancel').addEventListener('click', () => history.back());

  confirmBtn.addEventListener('click', async () => {
    const received = parse();
    if (received < bill.total) return;
    confirmBtn.disabled = true;
    const change = received - bill.total;

    const cust = bill.loyaltyCustomer || (loyaltyData ? loyaltyData.customer : null);
    const ptsUsed = bill.pointsUsed || (loyaltyData ? loyaltyData.pointsUsed : 0);
    const disc = bill.loyaltyDiscount || (loyaltyData ? loyaltyData.discountVND : 0);

    try {
      const record = await Store.payBill(billId, 'cash', {
        received,
        change,
        customerId: cust ? cust.id : null,
        customerName: cust ? cust.name : null,
        customerPhone: cust ? cust.phone : null,
        pointsUsed: ptsUsed,
        discountVND: disc,
        paidAmount: bill.total
      });
      if (CP.branches.find(branch => String(branch.id) === sessionStorage.getItem('cp_branch_id'))?.autoPrint) window.print();

      // Clear session for this bill
      sessionStorage.removeItem('pos_loyalty_' + billId);

      const paidTotal = record ? record.total : bill.total;
      const actualChange = Math.max(0, received - paidTotal);
      let msg = `Đã thu <b>${UI.formatVND(paidTotal)}</b>. Tiền thối khách: <b>${UI.formatVND(actualChange)}</b>.`;

      if (cust) {
        const usedPts = record ? Number(record.pointsUsed || 0) : Number(ptsUsed || 0);
        const discAmount = record ? Number(record.discountVND || 0) : Number(disc || 0);
        const earnedPts = record ? Number(record.pointsEarned || 0) : 0;
        const finalBalance = Math.max(0, Number(cust.points || 0) - usedPts + earnedPts);

        msg += `
          <div style="margin-top:14px; padding:12px; background:#f0fdf4; border-radius:10px; font-size:13.5px; border:1px solid #bbf7d0; text-align:left; line-height:1.6;">
            <div style="font-weight:700; color:#166534;">🎁 Tích điểm ChainPoint:</div>
            <div>• Hội viên: <b>${UI.escapeHtml(cust.name)}</b> (${UI.escapeHtml(cust.phone)})</div>
            ${usedPts > 0 ? `<div>• Điểm đã đổi trừ: <b style="color:#e11d48;">-${usedPts} pts</b> (-${UI.formatVND(discAmount)})</div>` : ''}
            <div>• Điểm mới tích lũy: <b style="color:#16a34a;">+${earnedPts} pts</b></div>
            <div>• Số dư điểm mới: <b style="color:#2563eb;">${finalBalance} pts</b></div>
          </div>
        `;
      }

      UI.showModal({
        icon: '✅', tone: 'success', title: 'Thanh toán thành công',
        message: msg,
        actions: [
          { label: 'Xem lịch sử', id: 'modal-history', onClick: () => (location.href = 'history.html') },
          { label: 'Về chọn bàn', id: 'modal-home', cls: 'btn-primary', onClick: () => (location.href = 'index.html') }
        ]
      });
    } catch (err) {
      confirmBtn.disabled = false;
      UI.showModal({
        icon: '⚠️',
        tone: 'warn',
        title: 'Không thể hoàn tất thanh toán',
        message: UI.escapeHtml(err.message || 'Lỗi kết nối Database khi thanh toán.'),
        actions: [{ label: 'Đóng', id: 'modal-err-close', cls: 'btn-primary' }]
      });
    }
  });

  update();
  input.focus();
})();
