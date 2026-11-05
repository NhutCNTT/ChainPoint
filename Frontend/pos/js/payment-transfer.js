(() => {
  const { bill, billId, loyaltyData } = PayCommon;
  if (!bill) return;

  const $ = (id) => document.getElementById(id);
  $('qr-amount').textContent = UI.formatVND(bill.total);
  $('qr-memo').textContent = bill.billId;

  const dev = $('dev-paid'), checkBtn = $('btn-check'), waitBtn = $('btn-wait');
  dev.checked = Store.isMockPaid(billId);
  dev.addEventListener('change', () => Store.setMockPaid(billId, dev.checked));

  // Chờ thanh toán: lưu bill vào trang chờ để thu ngân phục vụ bàn khác trước
  waitBtn.addEventListener('click', () => {
    Store.moveToPending(billId, 'transfer');
    UI.toast('Đã chuyển sang Chờ thanh toán');
    setTimeout(() => (location.href = 'pending.html'), 700);
  });

  // Thanh toán: kiểm tra với bên thứ 3 (mock)
  checkBtn.addEventListener('click', async () => {
    checkBtn.disabled = waitBtn.disabled = true;
    const original = checkBtn.innerHTML;
    checkBtn.innerHTML = '<span class="spinner"></span> Đang kiểm tra…';
    const paid = await Store.checkTransferPaid(billId);
    checkBtn.innerHTML = original; checkBtn.disabled = waitBtn.disabled = false;

    if (paid) {
      const cust = bill.loyaltyCustomer || (loyaltyData ? loyaltyData.customer : null);
      const ptsUsed = bill.pointsUsed || (loyaltyData ? loyaltyData.pointsUsed : 0);
      const disc = bill.loyaltyDiscount || (loyaltyData ? loyaltyData.discountVND : 0);

      let loyaltyResult = null;
      if (cust && window.LoyaltyStore) {
        loyaltyResult = LoyaltyStore.processCheckoutLoyalty({
          customerId: cust.id,
          pointsUsed: ptsUsed,
          billAmount: bill.grossTotal || bill.total,
          billId,
          branch: sessionStorage.getItem('cp_branch') || 'Chi nhánh Quận 1',
          staff: sessionStorage.getItem('cp_user') || 'Thu ngân'
        });
      }

      Store.payBill(billId, 'transfer', {
        customerId: cust ? cust.id : null,
        customerName: cust ? cust.name : null,
        phone: cust ? cust.phone : null,
        pointsUsed: ptsUsed,
        discountVND: disc,
        paidAmount: bill.total
      });

      Store.setMockPaid(billId, false);
      sessionStorage.removeItem('pos_loyalty_' + billId);

      let msg = `Đã nhận <b>${UI.formatVND(bill.total)}</b> qua chuyển khoản ngân hàng.`;
      if (loyaltyResult) {
        msg += `
          <div style="margin-top:14px; padding:12px; background:#f0fdf4; border-radius:10px; font-size:13.5px; border:1px solid #bbf7d0; text-align:left; line-height:1.6;">
            <div style="font-weight:700; color:#166534;">🎁 Tích điểm Bách Hóa Xanh:</div>
            <div>• Hội viên: <b>${loyaltyResult.customer.name}</b> (${loyaltyResult.customer.phone})</div>
            ${loyaltyResult.pointsUsed > 0 ? `<div>• Điểm đã đổi trừ: <b style="color:#e11d48;">-${loyaltyResult.pointsUsed} pts</b> (-${UI.formatVND(loyaltyResult.discountVND)})</div>` : ''}
            <div>• Điểm mới tích lũy: <b style="color:#16a34a;">+${loyaltyResult.pointsEarned} pts</b></div>
            <div>• Số dư điểm mới: <b style="color:#2563eb;">${loyaltyResult.finalBalance} pts</b> (= ${UI.formatVND(loyaltyResult.finalBalance * 1000)})</div>
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
    } else {
      UI.showModal({
        icon: '❌', tone: 'error', title: 'Chưa thanh toán',
        message: 'Hệ thống chưa nhận được giao dịch từ khách. Vui lòng kiểm tra lại sau ít phút.',
        actions: [{ label: 'Đóng', id: 'modal-close', cls: 'btn-primary' }]
      });
    }
  });
})();
