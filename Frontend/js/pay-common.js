/* Tải bill theo ?bill= và hiển thị danh sách món — dùng chung cho 3 trang thanh toán */
const PayCommon = (() => {
  const billId = UI.getParam('bill');
  const bill = billId ? Store.getBill(billId) : null;
  if (!bill) { location.replace('index.html'); }

  function renderSummary() {
    const t = getTable(bill.tableId);
    const title = document.getElementById('pay-sub');
    if (title) title.textContent = `${t ? t.name : bill.tableId} · #${bill.billId}`;
    const list = document.getElementById('sum-list');
    if (list) list.innerHTML = bill.items.map((i) => `
      <div class="sum-row">
        <span class="sum-name">${UI.escapeHtml(i.name)}${i.note ? `<span class="sum-note">📝 ${UI.escapeHtml(i.note)}</span>` : ''}</span>
        <span class="sum-qty">${i.qty} × ${UI.formatVND(i.price)}</span>
        <span class="sum-line money">${UI.formatVND(i.price * i.qty)}</span>
      </div>`).join('');
    const total = document.getElementById('sum-total');
    if (total) total.textContent = UI.formatVND(bill.total);
  }

  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.addEventListener('click', () => history.back());

  if (bill) renderSummary();
  return { bill, billId };
})();
