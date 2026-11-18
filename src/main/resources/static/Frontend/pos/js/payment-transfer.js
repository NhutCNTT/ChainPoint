(async () => {
  await PayCommon.ready;
  const { bill, billId, loyaltyData } = PayCommon;
  if (!bill) return;
  const $ = id => document.getElementById(id);
  const status = $('qr-status-indicator');
  $('btn-simulate-webhook')?.remove();
  let checking = false, timer;
  async function check() {
    if (checking) return;
    checking = true;
    try {
      const result = await API.get('/payment/status/' + encodeURIComponent(billId));
      if (result.paid) {
        clearInterval(timer); await Store.refresh(); sessionStorage.removeItem('pos_loyalty_' + billId);
        LoyaltyStore.refreshCustomers().catch(error => CP.notify(error.message));
        if (status) status.textContent = '✓ Ngân hàng đã xác nhận thanh toán.';
        UI.showModal({ icon: '✓', title: 'Thanh toán thành công', message: 'Giao dịch đã được máy chủ xác minh.', actions: [{ label: 'Lịch sử', onClick: () => location.href = 'history.html' }] });
      } else if (status) status.textContent = 'Chưa nhận được xác nhận từ ngân hàng.';
    } catch (error) { CP.notify(error.message); }
    finally { checking = false; }
  }
  $('btn-check')?.addEventListener('click', check);
  $('btn-wait')?.addEventListener('click', () => location.href = 'pending.html');
  try {
    const customer = bill.loyaltyCustomer || loyaltyData?.customer;
    const prepared = await Store.payBill(billId, 'transfer', { customerPhone: customer?.phone || bill.customerPhone,
      pointsUsed: bill.pointsUsed || loyaltyData?.pointsUsed || 0 });
    if (prepared.status === 'paid') { await check(); return; }
    const qr = await API.get('/payment/vietqr-info?billCode=' + encodeURIComponent(billId));
    $('qr-img').src = qr.qrImageUrl;
    $('qr-img').hidden = false;
    $('qr-amount').textContent = UI.formatVND(qr.amount); $('qr-memo').textContent = qr.billCode;
    $('qr-bank-name').textContent = qr.bankName; $('qr-account-name').textContent = qr.accountName; $('qr-account-no').textContent = qr.accountNumber;
    timer = setInterval(check, 3000);
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  } catch (error) {
    $('qr-img')?.remove(); if (status) status.textContent = error.message;
    CP.notify(error.message);
  }
})().catch(error => CP.notify(error.message));
