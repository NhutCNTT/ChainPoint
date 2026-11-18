(() => {
  const { bill, billId } = PayCommon;
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
      Store.payBill(billId, 'transfer');
      Store.setMockPaid(billId, false);
      UI.showModal({
        icon: '✅', tone: 'success', title: 'Thanh toán thành công',
        message: `Đã nhận <b>${UI.formatVND(bill.total)}</b> qua chuyển khoản.`,
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
