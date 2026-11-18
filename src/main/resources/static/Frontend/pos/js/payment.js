(() => {
  const { bill, billId } = PayCommon;
  if (!billId || !bill) return;

  const grossTotal = bill.grossTotal || bill.total;
  let activeCustomer = null;
  let pointsUsed = 0;
  let discountVND = 0;
  let searchTimer = null;

  const phoneInput = document.getElementById('cust-phone-input');
  const findBtn = document.getElementById('btn-find-cust');
  const quickAddBtn = document.getElementById('btn-quick-add-cust');
  const profileContainer = document.getElementById('cust-profile-container');
  const clearCustBtn = document.getElementById('btn-clear-cust');
  const notFoundBox = document.getElementById('cust-not-found');
  const notFoundText = document.getElementById('cust-not-found-text');
  const registerNotFoundBtn = document.getElementById('btn-register-notfound');
  const guestNotice = document.getElementById('guest-notice');
  const phoneError = document.getElementById('phone-error-msg');
  const pointsInput = document.getElementById('points-to-use');
  const useMaxBtn = document.getElementById('btn-use-max-points');
  const errorMsg = document.getElementById('loyalty-error-msg');
  const discountPreview = document.getElementById('discount-preview');
  const pointsToEarnEl = document.getElementById('points-to-earn');
  const pointsBalanceAfterEl = document.getElementById('points-balance-after');

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
  const quickPhoneInput = document.getElementById('quick-cust-phone');
  const quickNameInput = document.getElementById('quick-cust-name');
  const quickDobInput = document.getElementById('quick-cust-dob');
  const quickError = document.getElementById('quick-cust-error');

  const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 10);
  const isValidPhone = (phone) => /^(03|05|07|08|09)\d{8}$/.test(phone);

  function setNotice(element, message, display = 'block') {
    if (!element) return;
    element.textContent = message || '';
    element.style.display = message ? display : 'none';
  }

  function hideNotFound() {
    if (notFoundBox) notFoundBox.style.display = 'none';
  }

  if (grossTotalEl) grossTotalEl.textContent = UI.formatVND(grossTotal);

  function updateMethods() {
    const netTotal = Math.max(0, grossTotal - discountVND);
    if (sumTotalEl) sumTotalEl.textContent = UI.formatVND(netTotal);
    if (guestNotice) guestNotice.style.display = activeCustomer ? 'none' : 'block';

    sessionStorage.setItem('pos_loyalty_' + billId, JSON.stringify({
      customer: activeCustomer,
      customerPhone: activeCustomer ? activeCustomer.phone : null,
      pointsUsed,
      discountVND,
      netTotal,
      grossTotal
    }));

    if (cashLink) cashLink.href = 'payment-cash.html?bill=' + billId;
    if (transferLink) transferLink.href = 'payment-transfer.html?bill=' + billId;
  }

  function renderEarnPreview() {
    const netTotal = Math.max(0, grossTotal - discountVND);
    const pointsEarned = activeCustomer ? LoyaltyStore.calculatePointsEarned(netTotal) : 0;
    if (pointsToEarnEl) pointsToEarnEl.textContent = `+${pointsEarned} điểm`;

    const currentPoints = activeCustomer ? Number(activeCustomer.points || 0) : 0;
    const balance = activeCustomer
      ? Math.max(0, currentPoints - pointsUsed + pointsEarned)
      : 0;
    if (pointsBalanceAfterEl) pointsBalanceAfterEl.textContent = `${balance} điểm`;
  }

  function calculatePoints(value) {
    if (!activeCustomer) {
      pointsUsed = 0;
      discountVND = 0;
      renderEarnPreview();
      updateMethods();
      return;
    }

    const availablePoints = Number(activeCustomer.points || 0);
    pointsUsed = Math.max(0, parseInt(value, 10) || 0);
    discountVND = 0;
    setNotice(errorMsg, '');

    if (pointsUsed > 0) {
      if (pointsUsed > availablePoints) {
        setNotice(errorMsg, `Khách chỉ có ${availablePoints} điểm khả dụng!`);
        pointsUsed = 0;
      } else {
        const result = LoyaltyStore.calculateLoyaltyDiscount(pointsUsed, grossTotal);
        if (!result.valid) {
          setNotice(errorMsg, result.error);
          pointsUsed = 0;
        } else {
          discountVND = result.discountVND;
        }
      }
    }

    if (discountVND > 0) {
      discountPreview.textContent = `-${UI.formatVND(discountVND)}`;
      discountRow.style.display = 'flex';
      discountValEl.textContent = `-${UI.formatVND(discountVND)} (${pointsUsed} pts)`;
    } else {
      discountPreview.textContent = '-0đ';
      discountRow.style.display = 'none';
    }

    renderEarnPreview();
    updateMethods();
  }

  function resetSelection(keepPhone = false) {
    activeCustomer = null;
    pointsUsed = 0;
    discountVND = 0;
    if (profileContainer) profileContainer.style.display = 'none';
    if (pointsInput) {
      pointsInput.value = '';
      pointsInput.removeAttribute('max');
    }
    if (discountPreview) discountPreview.textContent = '-0đ';
    if (discountRow) discountRow.style.display = 'none';
    if (!keepPhone && phoneInput) phoneInput.value = '';
    setNotice(phoneError, '');
    setNotice(errorMsg, '');
    hideNotFound();
    renderEarnPreview();
    updateMethods();
  }

  function selectCustomer(customer, initialPoints = 0) {
    if (!customer) return;
    activeCustomer = customer;
    if (profileContainer) profileContainer.style.display = 'block';

    const availablePoints = Number(customer.points || 0);
    document.getElementById('cust-name-display').textContent = customer.name;
    document.getElementById('cust-phone-display').textContent = customer.phone;
    document.getElementById('cust-tier-display').textContent = `HỘI VIÊN ${customer.tier || 'BẠC'}`.toUpperCase();
    document.getElementById('cust-points-display').textContent = availablePoints;

    if (phoneInput) phoneInput.value = customer.phone || '';
    if (pointsInput) pointsInput.max = availablePoints;
    setNotice(phoneError, '');
    hideNotFound();

    const restoredPoints = Math.min(availablePoints, Math.max(0, Number(initialPoints) || 0));
    calculatePoints(restoredPoints);
  }

  async function searchCustomer() {
    const phone = normalizePhone(phoneInput ? phoneInput.value : '');
    if (phoneInput) phoneInput.value = phone;

    if (!isValidPhone(phone)) {
      hideNotFound();
      setNotice(phoneError, 'Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.');
      return;
    }

    if (activeCustomer && activeCustomer.phone === phone) return;

    setNotice(phoneError, '');
    const customer = await LoyaltyStore.getCustomerByPhone(phone);

    if (customer) {
      selectCustomer(customer);
      UI.toast(`Đã tìm thấy hội viên: ${customer.name}`, 'success');
      return;
    }

    resetSelection(true);
    if (phoneInput) phoneInput.value = phone;
    if (notFoundText) notFoundText.textContent = `Số điện thoại ${phone} chưa có hội viên.`;
    if (notFoundBox) notFoundBox.style.display = 'flex';
  }

  if (findBtn) findBtn.onclick = searchCustomer;
  if (phoneInput) {
    phoneInput.oninput = () => {
      const phone = normalizePhone(phoneInput.value);
      if (phoneInput.value !== phone) phoneInput.value = phone;
      setNotice(phoneError, '');
      hideNotFound();
      clearTimeout(searchTimer);
      if (!isValidPhone(phone)) return;
      searchTimer = setTimeout(searchCustomer, 400);
    };
    phoneInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(searchTimer);
        searchCustomer();
      }
    };
  }

  if (clearCustBtn) clearCustBtn.onclick = () => resetSelection();

  if (pointsInput) pointsInput.oninput = () => calculatePoints(pointsInput.value);

  if (useMaxBtn) {
    useMaxBtn.onclick = () => {
      if (!activeCustomer) return;
      const cfg = LoyaltyStore.getConfig();
      const maxDiscountAllowed = (grossTotal * cfg.maxDiscountPercent) / 100;
      const maxPointsAllowed = Math.floor(maxDiscountAllowed / cfg.pointValueVND);
      const pointsToUse = Math.min(Number(activeCustomer.points || 0), maxPointsAllowed);

      pointsInput.value = pointsToUse > 0 ? pointsToUse : 0;
      calculatePoints(pointsToUse);
    };
  }

  function openQuickModal(prefillPhone = '') {
    if (!quickModal) return;
    quickModal.style.display = 'grid';
    if (quickPhoneInput) quickPhoneInput.value = normalizePhone(prefillPhone);
    if (quickNameInput) quickNameInput.value = '';
    if (quickDobInput) quickDobInput.value = '';
    setNotice(quickError, '');
    if (quickNameInput) quickNameInput.focus();
  }

  function closeQuickModal() {
    if (quickModal) quickModal.style.display = 'none';
  }

  if (quickAddBtn) quickAddBtn.onclick = () => openQuickModal(phoneInput ? phoneInput.value : '');
  if (registerNotFoundBtn) registerNotFoundBtn.onclick = () => openQuickModal(phoneInput ? phoneInput.value : '');
  if (closeQuickBtn) closeQuickBtn.onclick = closeQuickModal;
  if (cancelQuickBtn) cancelQuickBtn.onclick = closeQuickModal;

  if (quickForm) {
    quickForm.onsubmit = async (e) => {
      e.preventDefault();
      const phone = normalizePhone(quickPhoneInput ? quickPhoneInput.value : '');
      const name = quickNameInput ? quickNameInput.value.trim() : '';
      const dob = quickDobInput ? quickDobInput.value : '';

      if (!isValidPhone(phone)) {
        setNotice(quickError, 'Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.');
        return;
      }
      if (!name) {
        setNotice(quickError, 'Vui lòng nhập họ và tên hội viên.');
        return;
      }

      const submitBtn = quickForm.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const newCustomer = await LoyaltyStore.saveCustomer({
        name,
        phone,
        dob,
        points: 0,
        tier: 'Bạc',
        branch: sessionStorage.getItem('cp_branch') || undefined
      });

      if (submitBtn) submitBtn.disabled = false;

      if (!newCustomer) {
        setNotice(quickError, 'Không thể đăng ký hội viên. Vui lòng kiểm tra lại số điện thoại hoặc kết nối Database.');
        return;
      }

      closeQuickModal();
      selectCustomer(newCustomer);
      UI.toast(`Đã đăng ký và chọn hội viên "${name}"`, 'success');
    };
  }

  try {
    const raw = sessionStorage.getItem('pos_loyalty_' + billId);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && saved.customer) {
      activeCustomer = saved.customer;
      discountVND = Number(saved.discountVND || 0);
      selectCustomer(saved.customer, saved.pointsUsed || 0);
      return;
    }
  } catch (e) {
    console.error(e);
  }

  renderEarnPreview();
  updateMethods();
})();
