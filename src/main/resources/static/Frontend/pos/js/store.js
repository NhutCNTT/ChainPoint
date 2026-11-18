/* Persistent POS state; only request identifiers and UI preferences use browser storage. */
const Store = (() => {
  let records = [];
  const calcTotal = items => items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const branchId = () => Number(sessionStorage.getItem('cp_branch_id'));
  const map = bill => ({
    billId: bill.billCode, tableId: bill.tableCode, status: bill.status, method: bill.paymentMethod,
    openedAt: bill.createdAt, createdAt: bill.createdAt, paidAt: bill.paidAt || bill.createdAt,
    customerPhone: bill.customerPhone, customerName: bill.customerName,
    grossAmount: Number(bill.grossAmount), total: Number(bill.finalAmount), discountVND: Number(bill.discountAmount),
    pointsUsed: Number(bill.pointsUsed), pointsEarned: Number(bill.pointsEarned), billHash: bill.billHash,
    received: bill.cashReceived == null ? null : Number(bill.cashReceived), change: bill.cashReceived == null ? null : Number(bill.cashReceived) - Number(bill.finalAmount),
    items: (bill.items || []).map(item => ({ id: 'p' + item.productId, realId: item.productId,
      name: item.productName, price: Number(item.unitPrice), qty: item.quantity, note: item.note || '' }))
  });
  async function refresh() {
    await CP.ready;
    if (!branchId()) { records = []; return records; }
    records = (await API.get('/orders?branchId=' + branchId())).map(map);
    return records;
  }
  const ready = refresh();
  ready.catch(error => CP.notify(error.message));
  const getOrder = table => records.find(b => b.tableId === table && b.status === 'open') || null;
  const getPending = () => records.filter(b => ['open', 'pending'].includes(b.status));
  const getPendingByTable = table => records.find(b => b.tableId === table && b.status === 'pending') || null;
  const getBill = code => records.find(b => b.billId === code) || null;
  const requestKey = table => {
    const key = `cp_pos_request_${sessionStorage.getItem('cp_user')}_${branchId()}_${table}`;
    let value = sessionStorage.getItem(key);
    if (!value) { value = crypto.randomUUID(); sessionStorage.setItem(key, value); }
    return value;
  };
  function payload(bill, method = 'cash', extra = {}) {
    if (!branchId()) throw new Error('Vui lòng chọn chi nhánh được phân công.');
    return { branchId: branchId(), tableCode: bill.tableId, orderCode: bill.billId || null,
      requestKey: requestKey(bill.tableId), paymentMethod: method,
      customerPhone: extra.customerPhone ?? bill.customerPhone ?? null,
      pointsToUse: Number(extra.pointsUsed ?? bill.pointsUsed ?? 0), cashReceived: extra.received ?? null,
      items: bill.items.map(item => {
        const id = item.realId || (typeof getMenuItem === 'function' ? getMenuItem(item.id)?.realId : null);
        if (!id) throw new Error('Sản phẩm không hợp lệ. Vui lòng tải lại thực đơn.');
        return { productId: id, quantity: item.qty, note: item.note || '' };
      }) };
  }
  async function saveOrder(tableId, items) {
    await ready;
    const existing = getOrder(tableId) || getPendingByTable(tableId);
    if (!items.length) {
      if (existing) await API.post('/pos/orders/' + encodeURIComponent(existing.billId) + '/cancel', {});
      sessionStorage.removeItem(`cp_pos_request_${sessionStorage.getItem('cp_user')}_${branchId()}_${tableId}`);
      await refresh(); return null;
    }
    const response = await API.post('/pos/orders', payload({ ...existing, tableId, items }));
    await refresh(); return getBill(response.billCode);
  }
  async function payBill(code, method, extra = {}) {
    await ready;
    const bill = getBill(code);
    if (!bill) throw new Error('Không tìm thấy đơn hàng. Vui lòng tải lại.');
    const response = await API.post('/pos/checkout', payload(bill, method, extra));
    await refresh();
    if (response.status === 'paid') {
      sessionStorage.removeItem(`cp_pos_request_${sessionStorage.getItem('cp_user')}_${branchId()}_${bill.tableId}`);
      window.LoyaltyStore?.refreshCustomers(true);
    }
    return getBill(response.billCode);
  }
  function getTableStatus(table) {
    const bill = getPendingByTable(table) || getOrder(table);
    return bill ? { status: bill.status === 'pending' ? 'pending' : 'busy', total: bill.total,
      count: bill.items.reduce((n, i) => n + i.qty, 0), openedAt: bill.openedAt } : { status: 'free', total: 0, count: 0 };
  }
  return { ready, refresh, refreshHistory: refresh, calcTotal, getOrder, getBill, saveOrder, payBill,
    getPending, getPendingByTable, getTableStatus,
    getOrders: () => Object.fromEntries(records.filter(b => b.status === 'open').map(b => [b.tableId, b])),
    getHistory: () => records.filter(b => ['paid', 'refunded'].includes(b.status)) };
})();
