/* Tải bill theo ?bill= và hiển thị danh sách món — dùng chung cho 3 trang thanh toán */
const PayCommon = (() => {
  const billId = UI.getParam('bill');
  const bill = billId ? Store.getBill(billId) : null;
  if (!bill) { location.replace('index.html'); }

  // Load loyalty session if available
  let loyaltyData = null;
  if (billId) {
    try {
      const raw = sessionStorage.getItem('pos_loyalty_' + billId);
      if (raw) loyaltyData = JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
  }

  if (bill && loyaltyData) {
    bill.grossTotal = bill.total;
    bill.loyaltyDiscount = loyaltyData.discountVND || 0;
    bill.pointsUsed = loyaltyData.pointsUsed || 0;
    bill.loyaltyCustomer = loyaltyData.customer || null;
    bill.total = Math.max(0, bill.grossTotal - bill.loyaltyDiscount);
  }

  function renderSummary() {
    const t = getTable(bill.tableId);
    const title = document.getElementById('pay-sub');
    if (title) title.textContent = `${t ? t.name : bill.tableId} · #${bill.billId}`;
    
    let html = bill.items.map((i) => `
      <div class="sum-row">
        <span class="sum-name">${UI.escapeHtml(i.name)}${i.note ? `<span class="sum-note">📝 ${UI.escapeHtml(i.note)}</span>` : ''}</span>
        <span class="sum-qty">${i.qty} × ${UI.formatVND(i.price)}</span>
        <span class="sum-line money">${UI.formatVND(i.price * i.qty)}</span>
      </div>`).join('');

    if (bill.loyaltyDiscount > 0) {
      html += `
        <div class="sum-row" style="color:#e11d48; font-weight:700;">
          <span class="sum-name">🎁 Giảm trừ Loyalty BHX (${bill.pointsUsed} pts)</span>
          <span class="sum-qty">—</span>
          <span class="sum-line money" style="color:#e11d48;">-${UI.formatVND(bill.loyaltyDiscount)}</span>
        </div>
      `;
    }

    const list = document.getElementById('sum-list');
    if (list) list.innerHTML = html;
    
    const total = document.getElementById('sum-total');
    if (total) total.textContent = UI.formatVND(bill.total);
  }

  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.addEventListener('click', () => history.back());

  if (bill) renderSummary();
  return { bill, billId, loyaltyData };
})();
