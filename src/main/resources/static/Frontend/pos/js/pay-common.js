const PayCommon = (() => {
  const state = { billId: new URLSearchParams(location.search).get('bill'), bill: null, loyaltyData: null };
  state.ready = (async () => {
    await Promise.all([Store.ready, window.POS_DATA_READY, CP.ready]);
    state.bill = Store.getBill(state.billId);
    if (!state.bill) { location.replace('index.html'); return; }
    try { state.loyaltyData = JSON.parse(sessionStorage.getItem('pos_loyalty_' + state.billId) || 'null'); } catch (_) {}
    const bill = state.bill;
    bill.grossTotal = bill.grossAmount;
    if (bill.status === 'open' && state.loyaltyData) {
      bill.loyaltyDiscount = state.loyaltyData.discountVND || 0;
      bill.pointsUsed = state.loyaltyData.pointsUsed || 0;
      bill.loyaltyCustomer = state.loyaltyData.customer || null;
      bill.total = bill.grossTotal - bill.loyaltyDiscount;
    } else { bill.loyaltyDiscount = bill.discountVND; }
    const table = getTable(bill.tableId);
    const title = document.getElementById('pay-sub');
    if (title) title.textContent = `${table?.name || bill.tableId} · #${bill.billId}`;
    const list = document.getElementById('sum-list');
    if (list) list.innerHTML = bill.items.map(item => `<div class="sum-row"><span class="sum-name">${UI.escapeHtml(item.name)}${item.note ? ' · ' + UI.escapeHtml(item.note) : ''}</span><span class="sum-qty">${item.qty} × ${UI.formatVND(item.price)}</span><span class="sum-line money">${UI.formatVND(item.price * item.qty)}</span></div>`).join('');
    const total = document.getElementById('sum-total'); if (total) total.textContent = UI.formatVND(bill.total);
    document.getElementById('btn-back')?.addEventListener('click', () => history.back());
  })();
  state.ready.catch(error => CP.notify(error.message));
  return state;
})();
