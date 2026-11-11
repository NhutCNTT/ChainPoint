// ChainPoint POS — Payment & Loyalty Checkout (Bách Hóa Xanh Model)
// Used by: pos/payment.html

(() => {
  const { bill, billId } = PayCommon;
  if (!billId || !bill) return;

  const grossTotal = bill.total;
  let activeCustomer = null;
  let pointsUsed = 0;
  let discountVND = 0;

  const phoneInput = document.getElementById('cust-phone-input');
  const findBtn = document.getElementById('btn-find-cust');
  const quickAddBtn = document.getElementById('btn-quick-add-cust');
  const profileContainer = document.getElementById('cust-profile-container');
  const pointsInput = document.getElementById('points-to-use');
  const useMaxBtn = document.getElementById('btn-use-max-points');
  const errorMsg = document.getElementById('loyalty-error-msg');
  const discountPreview = document.getElementById('discount-preview');
  const pointsToEarnEl = document.getElementById('points-to-earn');

  const grossTotalEl = document.getElementById('bill-gross-total');
  const discountRow = document.getElementById('loyalty-discount-row');
  const discountValEl = document.getElementById('bill-discount-val');
  const sumTotalEl = document.getElementById('sum-total');

  const cashLink = document.getElementById('method-cash');
  const transferLink = document.getElementById('method-transfer');

  const quickModal = document.getElementById('quickAddCustModal');
  const quickForm = document.getElementById('quickAddCustForm');
  const closeQuickBtn = document.getElementById('close-quick-cust');
  const cancelQuickBtn = document.getElementById('cancel-quick-cust');

  if (grossTotalEl) grossTotalEl.textContent = UI.formatVND(grossTotal);
  updateMethods();

  // Load existing session if navigated back
  const savedSession = sessionStorage.getItem('pos_loyalty_' + billId);
  if (savedSession) {
    try {
      const data = JSON.parse(savedSession);
      if (data.customer) {
        selectCustomer(data.customer, data.pointsUsed || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function updateMethods() {
    const netTotal = Math.max(0, grossTotal - discountVND);
    if (sumTotalEl) sumTotalEl.textContent = UI.formatVND(netTotal);

    sessionStorage.setItem('pos_loyalty_' + billId, JSON.stringify({
      customer: activeCustomer,
      pointsUsed,
      discountVND,
      netTotal,
      grossTotal
    }));

    cashLink.href = 'payment-cash.html?bill=' + billId;
    transferLink.href = 'payment-transfer.html?bill=' + billId;
  }

  function selectCustomer(cust, initialPoints = 0) {
    activeCustomer = cust;
    profileContainer.style.display = 'block';

    document.getElementById('cust-name-display').textContent = cust.name;
    document.getElementById('cust-phone-display').textContent = cust.phone;
    document.getElementById('cust-tier-display').textContent = `HỘI VIÊN ${cust.tier || 'BẠC'}`.toUpperCase();
    document.getElementById('cust-points-display').textContent = cust.points || 0;

    pointsInput.value = initialPoints > 0 ? initialPoints : '';
    calculatePoints(initialPoints);
  }

  function calculatePoints(pts) {
    if (!activeCustomer) return;
    const cfg = LoyaltyStore.getConfig();
    pointsUsed = parseInt(pts, 10) || 0;

    if (pointsUsed <= 0) {
      discountVND = 0;
      discountPreview.textContent = '-0đ';
      discountRow.style.display = 'none';
      errorMsg.style.display = 'none';
      const ptsEarned = LoyaltyStore.calculatePointsEarned(grossTotal);
      pointsToEarnEl.textContent = `+${ptsEarned} điểm`;
      updateMethods();
      return;
    }

    if (pointsUsed > activeCustomer.points) {
      errorMsg.textContent = `Khách chỉ có ${activeCustomer.points} điểm khả dụng!`;
      errorMsg.style.display = 'block';
      discountVND = 0;
      discountRow.style.display = 'none';
      updateMethods();
      return;
    }

    const res = LoyaltyStore.calculateLoyaltyDiscount(pointsUsed, grossTotal);
    if (!res.valid) {
      errorMsg.textContent = res.error;
      errorMsg.style.display = 'block';
      discountVND = 0;
      discountRow.style.display = 'none';
      updateMethods();
      return;
    }

    errorMsg.style.display = 'none';
    discountVND = res.discountVND;
    discountPreview.textContent = `-${UI.formatVND(discountVND)}`;
    discountRow.style.display = 'flex';
    discountValEl.textContent = `-${UI.formatVND(discountVND)} (${pointsUsed} pts)`;

    const netTotal = Math.max(0, grossTotal - discountVND);
    const ptsEarned = LoyaltyStore.calculatePointsEarned(netTotal);
    pointsToEarnEl.textContent = `+${ptsEarned} điểm`;

    updateMethods();
  }

  // Find customer by phone
  function searchCustomer() {
    const phone = (phoneInput.value || '').trim();
    if (!phone) {
      alert('Vui lòng nhập số điện thoại khách hàng.');
      return;
    }
    const cust = LoyaltyStore.getCustomerByPhone(phone);
    if (cust) {
      selectCustomer(cust);
    } else {
      if (confirm(`Số điện thoại ${phone} chưa đăng ký hội viên. Bạn có muốn tạo hội viên mới ngay không?`)) {
        openQuickModal(phone);
      }
    }
  }

  if (findBtn) findBtn.onclick = searchCustomer;
  if (phoneInput) {
    phoneInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchCustomer();
      }
    };
  }

  // Points input
  if (pointsInput) {
    pointsInput.oninput = () => calculatePoints(pointsInput.value);
  }

  // Use max points
  if (useMaxBtn) {
    useMaxBtn.onclick = () => {
      if (!activeCustomer) return;
      const cfg = LoyaltyStore.getConfig();
      const maxDiscountAllowed = (grossTotal * cfg.maxDiscountPercent) / 100;
      const maxPointsAllowed = Math.floor(maxDiscountAllowed / cfg.pointValueVND);
      const pointsToUse = Math.min(activeCustomer.points, maxPointsAllowed);

      pointsInput.value = pointsToUse > 0 ? pointsToUse : 0;
      calculatePoints(pointsToUse);
    };
  }

  // Quick Add Modal
  function openQuickModal(prefillPhone = '') {
    quickModal.style.display = 'grid';
    document.getElementById('quick-cust-phone').value = prefillPhone;
    document.getElementById('quick-cust-name').value = '';
    document.getElementById('quick-cust-dob').value = '';
    document.getElementById('quick-cust-name').focus();
  }

  function closeQuickModal() {
    quickModal.style.display = 'none';
  }

  if (quickAddBtn) quickAddBtn.onclick = () => openQuickModal(phoneInput.value.trim());
  if (closeQuickBtn) closeQuickBtn.onclick = closeQuickModal;
  if (cancelQuickBtn) cancelQuickBtn.onclick = closeQuickModal;

  if (quickForm) {
    quickForm.onsubmit = (e) => {
      e.preventDefault();
      const phone = document.getElementById('quick-cust-phone').value.trim();
      const name = document.getElementById('quick-cust-name').value.trim();
      const dob = document.getElementById('quick-cust-dob').value;

      const newCust = LoyaltyStore.saveCustomer({
        name,
        phone,
        dob,
        points: 0,
        tier: 'Bạc',
        branch: sessionStorage.getItem('cp_branch') || 'Chi nhánh Quận 1'
      });

      closeQuickModal();
      phoneInput.value = phone;
      selectCustomer(newCust);
      alert(`Đã đăng ký thành công hội viên "${name}"!`);
    };
  }
})();
