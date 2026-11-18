// ChainPoint POS — Payment & Loyalty Checkout
// Used by: pos/payment.html

(async () => {
  await PayCommon.ready;
  await LoyaltyStore.ready;
  const { bill, billId } = PayCommon;
  if (!billId || !bill) return;
  if (bill.status === 'pending') { location.replace('payment-transfer.html?bill=' + encodeURIComponent(billId)); return; }

  const grossTotal = bill.grossTotal || bill.total;
  let activeCustomer = null;
  let pointsUsed = 0;
  let discountVND = 0;
  let lookupGeneration = 0;

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
  const status = document.createElement('p'); status.id = 'customer-lookup-status'; status.setAttribute('role', 'status');
  phoneInput.parentElement.after(status);
  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn'; remove.textContent = 'Bỏ chọn khách hàng';
  profileContainer.appendChild(remove);
  function normalizePhone(value) {
    let phone = value.replace(/[\s().-]/g, '').replace(/^\+?84/, '0');
    if (!/^0[35789]\d{8}$/.test(phone)) throw new Error('Vui lòng nhập số điện thoại di động Việt Nam hợp lệ.');
    return phone;
  }
  function clearCustomer() {
    activeCustomer = null; pointsUsed = 0; discountVND = 0; pointsInput.value = '';
    profileContainer.style.display = 'none'; discountRow.style.display = 'none'; errorMsg.style.display = 'none';
    updateMethods();
  }
  remove.onclick = () => { clearCustomer(); phoneInput.value = ''; status.textContent = 'Mua hàng không dùng hội viên.'; phoneInput.focus(); };
  phoneInput.addEventListener('input', () => { lookupGeneration++; if (activeCustomer) clearCustomer(); });
  document.getElementById('loyalty-rules').textContent = `${LoyaltyStore.getConfig().earnRatioVND.toLocaleString('vi-VN')} ₫ = 1 điểm · 1 điểm = ${LoyaltyStore.getConfig().pointValueVND.toLocaleString('vi-VN')} ₫`;
  // Load existing session if navigated back
  const savedSession = sessionStorage.getItem('pos_loyalty_' + billId);
  if (savedSession) {
    try {
      const data = JSON.parse(savedSession);
      if (data.customer) {
        const current = await LoyaltyStore.getCustomerByPhone(data.customer.phone);
        if (current) selectCustomer(current, data.pointsUsed || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }

  updateMethods();
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
    if (!cust) return;
    activeCustomer = cust;
    profileContainer.style.display = 'block';

    document.getElementById('cust-name-display').textContent = cust.name;
    document.getElementById('cust-phone-display').textContent = cust.phone;
    document.getElementById('cust-tier-display').textContent = `HỘI VIÊN ${cust.tier || 'BẠC'}`.toUpperCase();
    document.getElementById('cust-points-display').textContent = `${cust.points || 0} (có thể dùng: ${cust.availablePoints ?? cust.points ?? 0})`;

    phoneInput.value = cust.phone;
    status && (status.textContent = 'Đã chọn khách hàng. Điểm hiển thị là ước tính trước thanh toán.');
    pointsInput.value = initialPoints > 0 ? initialPoints : '';
    calculatePoints(initialPoints);
  }

  function calculatePoints(pts) {
    if (!activeCustomer) return;
    pointsUsed = Number(pts) || 0;
    if (!Number.isInteger(pointsUsed) || pointsUsed < 0) { errorMsg.textContent = 'Số điểm phải là số nguyên không âm.'; errorMsg.style.display = 'block'; return; }

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

    if (pointsUsed > (activeCustomer.availablePoints ?? activeCustomer.points)) {
      errorMsg.textContent = `Khách chỉ có ${activeCustomer.availablePoints ?? activeCustomer.points} điểm khả dụng!`;
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

  [cashLink, transferLink].forEach(link => link.addEventListener('click', event => {
    if (findBtn.disabled) { event.preventDefault(); return; }
    if (errorMsg.style.display !== 'none') { event.preventDefault(); pointsInput.focus(); }
  }));
  // Find customer by phone from Database
  async function searchCustomer() {
    if (findBtn.disabled) return;
    clearCustomer();
    const generation = ++lookupGeneration;
    findBtn.disabled = true; status.textContent = 'Đang tìm khách hàng...';
    try {
      const phone = normalizePhone(phoneInput.value); phoneInput.value = phone;
      const cust = await LoyaltyStore.getCustomerByPhone(phone);
      if (generation !== lookupGeneration) return;
      if (cust) selectCustomer(cust);
      else { status.textContent = 'Chưa tìm thấy hội viên. Có thể thêm mới hoặc tiếp tục không dùng hội viên.'; }
    } catch (error) { status.textContent = error.message; }
    finally { findBtn.disabled = false; }
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
      const pointsToUse = Math.min(activeCustomer.availablePoints ?? activeCustomer.points, maxPointsAllowed);

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
    phoneInput.focus();
  }
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeQuickModal(); });
  quickModal.addEventListener('click', event => { if (event.target === quickModal) closeQuickModal(); });

  if (quickAddBtn) quickAddBtn.onclick = () => openQuickModal(phoneInput.value.trim());
  if (closeQuickBtn) closeQuickBtn.onclick = closeQuickModal;
  if (cancelQuickBtn) cancelQuickBtn.onclick = closeQuickModal;

  if (quickForm) {
    quickForm.onsubmit = async (e) => {
      e.preventDefault();
      const submit = quickForm.querySelector('[type=submit]');
      if (submit.disabled) return;
      submit.disabled = true;
      try {
      const phone = normalizePhone(document.getElementById('quick-cust-phone').value);
      const name = document.getElementById('quick-cust-name').value.trim();
      const dob = document.getElementById('quick-cust-dob').value;

      const newCust = await LoyaltyStore.saveCustomer({
        name,
        phone,
        dob,
        points: 0,
        tier: 'Bạc',
        branch: sessionStorage.getItem('cp_branch') || 'Cửa hàng'
      });

      if (!newCust) {
        alert('Không thể đăng ký hội viên vào Database. Vui lòng kiểm tra lại số điện thoại.');
        return;
      }

      closeQuickModal();
      phoneInput.value = phone;
      selectCustomer(newCust);
      status.textContent = 'Đã đăng ký và chọn hội viên.';
      } catch (error) { status.textContent = error.message; CP.notify(error.message); }
      finally { submit.disabled = false; }
    };
  }
})();
