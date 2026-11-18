(() => {
  const { bill, billId, loyaltyData } = PayCommon;
  if (!bill) return;

  const $ = (id) => document.getElementById(id);
  const AMOUNT = Math.round(bill.total);
  $('qr-amount').textContent = UI.formatVND(AMOUNT);
  $('qr-memo').textContent = bill.billId;

  const PAYMENT_API_BASE = (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '')
    ? 'http://localhost:8080/api/v1'
    : ((typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? `${window.location.origin}/api/v1` : 'http://localhost:8080/api/v1');

  const paymentHeaders = (extra = {}) => {
    const token = sessionStorage.getItem('cp_token') || localStorage.getItem('cp_token') || '';
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra
    };
  };

  // Nạp thông tin tài khoản và mã VietQR động từ Backend API (/api/v1/payment/vietqr-info)
  async function loadVietQRInfo() {
    try {
      const res = await fetch(`${PAYMENT_API_BASE}/payment/vietqr-info?billCode=${encodeURIComponent(bill.billId)}&amount=${AMOUNT}`, { headers: paymentHeaders() });
      if (res.ok) {
        const info = await res.json();
        if ($('qr-img') && info.qrImageUrl) $('qr-img').src = info.qrImageUrl;
        if ($('qr-bank-name')) $('qr-bank-name').textContent = info.bankName || 'MBBank (Napas 247)';
        if ($('qr-account-name')) $('qr-account-name').textContent = info.accountName || 'CONG TY CO PHAN CHAINPOINT';
        if ($('qr-account-no')) $('qr-account-no').textContent = info.accountNumber || '0387654321';
        if ($('qr-memo') && info.billCode) $('qr-memo').textContent = info.billCode;
        return;
      }
    } catch (e) {
      console.warn('Không thể tải thông tin VietQR từ Backend API:', e);
    }

    const fallbackUrl = `https://img.vietqr.io/image/970422-0387654321-compact2.png?amount=${AMOUNT}&addInfo=${encodeURIComponent(bill.billId)}&accountName=${encodeURIComponent('CONG TY CO PHAN CHAINPOINT')}`;
    if ($('qr-img')) $('qr-img').src = fallbackUrl;
    if ($('qr-bank-name')) $('qr-bank-name').textContent = 'MBBank (Napas 247)';
    if ($('qr-account-name')) $('qr-account-name').textContent = 'CONG TY CO PHAN CHAINPOINT';
    if ($('qr-account-no')) $('qr-account-no').textContent = '0387654321';
  }

  loadVietQRInfo();

  const checkBtn = $('btn-check');
  const waitBtn = $('btn-wait');
  const simulateBtn = $('btn-simulate-webhook');
  const statusIndicator = $('qr-status-indicator');

  let pollingInterval = null;
  let isCompleted = false;

  if (waitBtn) {
    waitBtn.addEventListener('click', () => {
      stopPolling();
      Store.moveToPending(billId, 'transfer');
      UI.toast('Đã chuyển đơn sang hàng đợi Chờ thanh toán');
      setTimeout(() => (location.href = 'pending.html'), 700);
    });
  }

  async function completePaymentSuccess(source = 'Webhook VietQR tự động') {
    if (isCompleted) return;
    isCompleted = true;
    stopPolling();

    const cust = bill.loyaltyCustomer || (loyaltyData ? loyaltyData.customer : null);
    const ptsUsed = bill.pointsUsed || (loyaltyData ? loyaltyData.pointsUsed : 0);
    const disc = bill.loyaltyDiscount || (loyaltyData ? loyaltyData.discountVND : 0);

    try {
      const record = await Store.payBill(billId, 'transfer', {
        customerId: cust ? cust.id : null,
        customerName: cust ? cust.name : null,
        customerPhone: cust ? cust.phone : null,
        pointsUsed: ptsUsed,
        discountVND: disc,
        paidAmount: bill.total
      });

      if (statusIndicator) {
        statusIndicator.style.background = '#dcfce7';
        statusIndicator.style.border = '1px solid #86efac';
        statusIndicator.style.color = '#15803d';
        statusIndicator.innerHTML = `✅ <b>Đã nhận được thanh toán từ Ngân hàng!</b> (${UI.escapeHtml(source)})`;
      }

      Store.setMockPaid(billId, false);
      sessionStorage.removeItem('pos_loyalty_' + billId);

      const paidTotal = record ? record.total : bill.total;
      let msg = `Đã nhận chuyển khoản tự động <b>${UI.formatVND(paidTotal)}</b> qua VietQR Napas 247.`;

      if (cust) {
        const cfg = window.LoyaltyStore ? LoyaltyStore.getConfig() : { pointValueVND: 1000 };
        const usedPts = record ? Number(record.pointsUsed || 0) : Number(ptsUsed || 0);
        const discAmount = record ? Number(record.discountVND || 0) : Number(disc || 0);
        const earnedPts = record ? Number(record.pointsEarned || 0) : 0;
        const finalBalance = Math.max(0, Number(cust.points || 0) - usedPts + earnedPts);

        msg += `
          <div style="margin-top:14px; padding:12px; background:#f0fdf4; border-radius:10px; font-size:13.5px; border:1px solid #bbf7d0; text-align:left; line-height:1.6;">
            <div style="font-weight:700; color:#166534;">🎁 Tích điểm Bách Hóa Xanh (Database):</div>
            <div>• Hội viên: <b>${UI.escapeHtml(cust.name)}</b> (${UI.escapeHtml(cust.phone)})</div>
            ${usedPts > 0 ? `<div>• Điểm đã đổi trừ: <b style="color:#e11d48;">-${usedPts} pts</b> (-${UI.formatVND(discAmount)})</div>` : ''}
            <div>• Điểm mới tích lũy: <b style="color:#16a34a;">+${earnedPts} pts</b></div>
            <div>• Số dư điểm mới: <b style="color:#2563eb;">${finalBalance} pts</b> (= ${UI.formatVND(finalBalance * (cfg.pointValueVND || 1000))})</div>
          </div>
        `;
      }

      UI.showModal({
        icon: '🎉', tone: 'success', title: 'Thanh toán VietQR thành công',
        message: msg,
        actions: [
          { label: 'Xem lịch sử đơn', id: 'modal-history', onClick: () => (location.href = 'history.html') },
          { label: 'Về chọn bàn', id: 'modal-home', cls: 'btn-primary', onClick: () => (location.href = 'index.html') }
        ]
      });
    } catch (err) {
      isCompleted = false;
      UI.showModal({
        icon: '⚠️',
        tone: 'warn',
        title: 'Không thể lưu hóa đơn vào Database',
        message: UI.escapeHtml(err.message || 'Lỗi kết nối Database khi thanh toán.'),
        actions: [{ label: 'Đóng', id: 'modal-err-close', cls: 'btn-primary' }]
      });
    }
  }

  function startPolling() {
    pollingInterval = setInterval(async () => {
      if (isCompleted) return;

      try {
        const res = await fetch(`${PAYMENT_API_BASE}/payment/status/${encodeURIComponent(billId)}`, { headers: paymentHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data && data.paid) {
            completePaymentSuccess('Webhook Ngân hàng tự động');
            return;
          }
        }
      } catch (err) {}

      if (Store.isMockPaid(billId)) {
        completePaymentSuccess('Mô phỏng Webhook');
      }
    }, 2000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  if (simulateBtn) {
    simulateBtn.addEventListener('click', async () => {
      simulateBtn.disabled = true;
      simulateBtn.innerHTML = '<span class="spinner"></span> Đang gửi Webhook…';

      try {
        await fetch(`${PAYMENT_API_BASE}/payment/simulate`, {
          method: 'POST',
          headers: paymentHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ billCode: billId, amount: bill.total })
        });
      } catch (e) {
        console.warn('Lỗi gọi simulate API:', e);
      }

      Store.setMockPaid(billId, true);
      await completePaymentSuccess('Mô phỏng Webhook thành công');
    });
  }

  if (checkBtn) {
    checkBtn.addEventListener('click', async () => {
      checkBtn.disabled = waitBtn.disabled = true;
      const original = checkBtn.innerHTML;
      checkBtn.innerHTML = '<span class="spinner"></span> Đang kiểm tra…';

      let paid = Store.isMockPaid(billId);
      try {
        const res = await fetch(`${PAYMENT_API_BASE}/payment/status/${encodeURIComponent(billId)}`, { headers: paymentHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data && data.paid) paid = true;
        }
      } catch (e) {}

      if (!paid) {
        const confirmManual = confirm(`Thu ngân đã nhận được tiền ${UI.formatVND(bill.total)} từ khách hàng? Bấm OK để xác nhận hoàn tất hóa đơn.`);
        if (confirmManual) {
          paid = true;
        }
      }

      checkBtn.innerHTML = original;
      checkBtn.disabled = waitBtn.disabled = false;

      if (paid) {
        await completePaymentSuccess('Thu ngân xác nhận');
      } else {
        UI.showModal({
          icon: '⏳', tone: 'warn', title: 'Chưa nhận được giao dịch',
          message: 'Hệ thống chưa ghi nhận tiền về từ ngân hàng. Khách vui lòng kiểm tra lại tài khoản hoặc quét lại mã VietQR.',
          actions: [{ label: 'Đóng', id: 'modal-close', cls: 'btn-primary' }]
        });
      }
    });
  }

  startPolling();
})();
