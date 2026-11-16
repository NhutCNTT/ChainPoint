(() => {
  const { bill, billId, loyaltyData } = PayCommon;
  if (!bill) return;

  const $ = (id) => document.getElementById(id);
  $('qr-amount').textContent = UI.formatVND(bill.total);
  $('qr-memo').textContent = bill.billId;

  const PAYMENT_API_BASE = (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '') 
    ? 'http://localhost:8080/api/v1' 
    : ((typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? `${window.location.origin}/api/v1` : 'http://localhost:8080/api/v1');

  // Cấu hình thông tin thanh toán VietQR động
  const BANK_BIN = '970422'; // MBBank Napas 247
  const ACCOUNT_NO = '0387654321';
  const ACCOUNT_NAME = encodeURIComponent('CONG TY CO PHAN CHAINPOINT');
  const MEMO = encodeURIComponent(bill.billId);
  const AMOUNT = Math.round(bill.total);

  // Sinh URL mã QR VietQR Napas 247 chuẩn quốc gia
  const vietQrUrl = `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NO}-compact2.png?amount=${AMOUNT}&addInfo=${MEMO}&accountName=${ACCOUNT_NAME}`;
  const qrImg = $('qr-img');
  if (qrImg) {
    qrImg.src = vietQrUrl;
  }

  const checkBtn = $('btn-check');
  const waitBtn = $('btn-wait');
  const simulateBtn = $('btn-simulate-webhook');
  const statusIndicator = $('qr-status-indicator');

  let pollingInterval = null;
  let isCompleted = false;

  // Chờ thanh toán: lưu bill vào trang chờ để thu ngân phục vụ bàn khác trước
  if (waitBtn) {
    waitBtn.addEventListener('click', () => {
      stopPolling();
      Store.moveToPending(billId, 'transfer');
      UI.toast('Đã chuyển đơn sang hàng đợi Chờ thanh toán');
      setTimeout(() => (location.href = 'pending.html'), 700);
    });
  }

  // Hàm xử lý hoàn tất thanh toán (sau khi nhận được tiền từ Webhook hoặc xác nhận)
  async function completePaymentSuccess(source = 'Webhook VietQR tự động') {
    if (isCompleted) return;
    isCompleted = true;
    stopPolling();

    if (statusIndicator) {
      statusIndicator.style.background = '#dcfce7';
      statusIndicator.style.border = '1px solid #86efac';
      statusIndicator.style.color = '#15803d';
      statusIndicator.innerHTML = `✅ <b>Đã nhận được thanh toán từ Ngân hàng!</b> (${source})`;
    }

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
        branch: sessionStorage.getItem('cp_branch') || 'Cửa hàng',
        staff: sessionStorage.getItem('cp_user') || 'Thu ngân'
      });
    }

    // Ghi nhận bill và đồng bộ lưu vào cơ sở dữ liệu MySQL Backend
    await Store.payBill(billId, 'transfer', {
      customerId: cust ? cust.id : null,
      customerName: cust ? cust.name : null,
      customerPhone: cust ? cust.phone : null,
      pointsUsed: ptsUsed,
      discountVND: disc,
      paidAmount: bill.total
    });

    Store.setMockPaid(billId, false);
    sessionStorage.removeItem('pos_loyalty_' + billId);

    let msg = `Đã nhận chuyển khoản tự động <b>${UI.formatVND(bill.total)}</b> qua VietQR Napas 247.`;
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
      icon: '🎉', tone: 'success', title: 'Thanh toán VietQR thành công',
      message: msg,
      actions: [
        { label: 'Xem lịch sử đơn', id: 'modal-history', onClick: () => (location.href = 'history.html') },
        { label: 'Về chọn bàn', id: 'modal-home', cls: 'btn-primary', onClick: () => (location.href = 'index.html') }
      ]
    });
  }

  // Tự động Polling (thăm dò) trạng thái hóa đơn từ Backend Webhook mỗi 2 giây
  function startPolling() {
    pollingInterval = setInterval(async () => {
      if (isCompleted) return;

      try {
        // Kiểm tra xem backend đã nhận được webhook ngân hàng cho billId này chưa
        const res = await fetch(`${PAYMENT_API_BASE}/payment/status/${billId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.paid) {
            completePaymentSuccess('Webhook Ngân hàng tự động');
            return;
          }
        }
      } catch (err) {
        // Fallback kiểm tra mock nếu chưa chạy backend
      }

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

  // Nút Test Mô phỏng Webhook Chuyển khoản từ Ngân hàng
  if (simulateBtn) {
    simulateBtn.addEventListener('click', async () => {
      simulateBtn.disabled = true;
      simulateBtn.innerHTML = '<span class="spinner"></span> Đang gửi Webhook…';

      try {
        // Gửi webhook giả lập vào backend API
        await fetch(`${PAYMENT_API_BASE}/payment/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ billCode: billId, amount: bill.total })
        });
      } catch (e) {
        console.warn('Lỗi gọi simulate API:', e);
      }

      Store.setMockPaid(billId, true);
      await completePaymentSuccess('Mô phỏng Webhook thành công');
    });
  }

  // Nút Kiểm tra / Xác nhận thủ công từ Thu ngân
  if (checkBtn) {
    checkBtn.addEventListener('click', async () => {
      checkBtn.disabled = waitBtn.disabled = true;
      const original = checkBtn.innerHTML;
      checkBtn.innerHTML = '<span class="spinner"></span> Đang kiểm tra…';

      let paid = Store.isMockPaid(billId);
      try {
        const res = await fetch(`${PAYMENT_API_BASE}/payment/status/${billId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.paid) paid = true;
        }
      } catch (e) {}

      // Nếu thu ngân bấm xác nhận trực tiếp mà khách đã chuyển tiền xong
      if (!paid) {
        // Cho phép thu ngân bấm xác nhận sau khi nhìn màn hình app khách
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

  // Bắt đầu lắng nghe trạng thái thanh toán tự động ngay khi mở trang
  startPolling();
})();
