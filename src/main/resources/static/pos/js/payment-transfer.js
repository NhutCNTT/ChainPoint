(() => {
  const { bill, billId, loyaltyData } = PayCommon;
  if (!bill) return;
  const $ = id => document.getElementById(id);
  const check = $('btn-check'), wait = $('btn-wait'), status = $('qr-status-indicator');
  $('qr-amount').textContent = UI.formatVND(bill.total);
  $('qr-memo').textContent = billId;
  check.disabled = true;
  window.API.get(`/payment/vietqr-info?billCode=${encodeURIComponent(billId)}&amount=${bill.total}`)
    .then(info => {
      $('qr-img').src = info.qrImageUrl;
      $('qr-bank-name').textContent = info.bankName;
      $('qr-account-name').textContent = info.accountName;
      $('qr-account-no').textContent = info.accountNumber;
      check.disabled = false;
    }).catch(error => {
      status.textContent = error.message;
      $('qr-img').hidden = true;
    });
  wait.addEventListener('click', async () => {
    try { await Store.moveToPending(billId, 'transfer'); } catch (error) { UI.toast(error.message, 'error'); return; }
    location.href = 'pending.html';
  });
  check.addEventListener('click', async () => {
    if (!confirm(`Đã kiểm tra tài khoản ngân hàng và nhận đủ ${UI.formatVND(bill.total)}?`)) return;
    check.disabled = wait.disabled = true;
    const customer = bill.loyaltyCustomer || loyaltyData?.customer;
    try {
      const record = await Store.payBill(billId, 'transfer', {
        paidAmount: bill.total,
        customerPhone: customer?.phone || null,
        pointsUsed: bill.pointsUsed || loyaltyData?.pointsUsed || 0
      });
      sessionStorage.removeItem('pos_loyalty_' + billId);
      status.textContent = 'Thu ngân đã xác nhận nhận tiền chuyển khoản.';
      UI.showModal({ icon: '✅', tone: 'success', title: 'Đã lưu hóa đơn',
        message: `Hóa đơn ${UI.escapeHtml(record.billId)}: ${UI.formatVND(record.total)}.`,
        actions: [{ label: 'Lịch sử hóa đơn', onClick: () => location.href = 'history.html' },
          { label: 'Về chọn bàn', cls: 'btn-primary', onClick: () => location.href = 'index.html' }] });
    } catch (error) {
      check.disabled = wait.disabled = false;
      UI.toast(error.message, 'error');
    }
  });
})();
