/* Mock store bằng localStorage — sau này thay thế bằng fetch() tới Backend.
 *  pos.orders  : { [tableId]: { billId, tableId, items:[{id,name,price,qty,note}], openedAt } }
 *  pos.pending : [{ billId, tableId, items, total, method:'temp'|'transfer', openedAt, createdAt }]
 *  pos.history : [{ billId, tableId, items, total, method:'cash'|'transfer', paidAt, received?, change? }]
 *  pos.mockPaid: { [billId]: true }  // giả lập "bên thứ 3 đã nhận tiền"
 */
const Store = (() => {
  const K = { orders: 'pos.orders', pending: 'pos.pending', history: 'pos.history', paid: 'pos.mockPaid', seeded: 'pos.seeded.v1' };

  const read = (k, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; }
  };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const calcTotal = (items) => items.reduce((s, i) => s + i.price * i.qty, 0);
  const newBillId = () => 'HD' + Date.now().toString().slice(-8);

  /* ---------- Orders (bàn đang dùng) ---------- */
  const getOrders = () => read(K.orders, {});
  const getOrder = (tableId) => getOrders()[tableId] || null;

  function saveOrder(tableId, items) {
    const orders = getOrders();
    const pending = getPending();
    const pend = pending.find((p) => p.tableId === tableId);
    const base = orders[tableId] || pend || {};
    if (!items.length) {
      delete orders[tableId];
      write(K.orders, orders);
      write(K.pending, pending.filter((p) => p.tableId !== tableId));
      return null;
    }
    const order = {
      billId: base.billId || newBillId(),
      tableId,
      items: items.map((i) => ({ ...i })),
      openedAt: base.openedAt || new Date().toISOString()
    };
    orders[tableId] = order;
    write(K.orders, orders);
    if (pend) write(K.pending, pending.filter((p) => p.tableId !== tableId)); // mở lại để sửa -> bỏ khỏi chờ
    return order;
  }

  /* ---------- Pending (chờ thanh toán) ---------- */
  const getPending = () => read(K.pending, []);
  const getPendingByTable = (tableId) => getPending().find((p) => p.tableId === tableId) || null;

  function moveToPending(billId, method) {
    const orders = getOrders();
    const pending = getPending();
    const entry = Object.values(orders).find((o) => o.billId === billId);
    const existing = pending.find((p) => p.billId === billId);
    if (entry) {
      delete orders[entry.tableId];
      write(K.orders, orders);
      pending.push({ ...entry, total: calcTotal(entry.items), method, createdAt: new Date().toISOString() });
    } else if (existing) {
      existing.method = method;
    } else return false;
    write(K.pending, pending);
    return true;
  }

  /* ---------- Bill (lấy từ order hoặc pending) ---------- */
  function getBill(billId) {
    const p = getPending().find((x) => x.billId === billId);
    if (p) return { ...p, total: calcTotal(p.items), source: 'pending' };
    const o = Object.values(getOrders()).find((x) => x.billId === billId);
    if (o) return { ...o, total: calcTotal(o.items), source: 'order' };
    return null;
  }

  /* ---------- Thanh toán ---------- */
  function payBill(billId, method, extra = {}) {
    const bill = getBill(billId);
    if (!bill) return null;
    const orders = getOrders();
    delete orders[bill.tableId];
    write(K.orders, orders);
    write(K.pending, getPending().filter((p) => p.billId !== billId));
    const record = {
      billId, tableId: bill.tableId, items: bill.items, total: bill.total,
      method, paidAt: new Date().toISOString(), ...extra
    };
    const history = getHistory();
    history.unshift(record);
    write(K.history, history);
    return record;
  }

  const getHistory = () => read(K.history, []);

  /* ---------- Trạng thái bàn ---------- */
  function getTableStatus(tableId) {
    const p = getPendingByTable(tableId);
    if (p) return { status: 'pending', total: calcTotal(p.items), count: p.items.reduce((s, i) => s + i.qty, 0), openedAt: p.openedAt };
    const o = getOrder(tableId);
    if (o) return { status: 'busy', total: calcTotal(o.items), count: o.items.reduce((s, i) => s + i.qty, 0), openedAt: o.openedAt };
    return { status: 'free', total: 0, count: 0 };
  }

  /* ---------- Mock bên thứ 3 (xác nhận chuyển khoản) ---------- */
  const isMockPaid = (billId) => !!read(K.paid, {})[billId];
  function setMockPaid(billId, v) { const m = read(K.paid, {}); if (v) m[billId] = true; else delete m[billId]; write(K.paid, m); }
  /** Giả lập gọi API bên thứ 3 (SePay/Casso...). Trả về Promise<boolean>. */
  const checkTransferPaid = (billId) => new Promise((res) => setTimeout(() => res(isMockPaid(billId)), 1000));

  /* ---------- Seed dữ liệu demo ---------- */
  function seed() {
    if (localStorage.getItem(K.seeded)) return;
    const it = (id, qty, note = '') => { const m = getMenuItem(id); return { id, name: m.name, price: m.price, qty, note }; };
    const ago = (days, h, m) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, m, 0, 0); return d.toISOString(); };
    const mins = (n) => new Date(Date.now() - n * 60000).toISOString();

    write(K.orders, {
      A3: { billId: 'HD90000001', tableId: 'A3', openedAt: mins(25), items: [it('m01', 2, 'Chín vừa'), it('m11', 3), it('m21', 2)] },
      B2: { billId: 'HD90000002', tableId: 'B2', openedAt: mins(8), items: [it('m13', 2, 'Ít đường')] }
    });
    write(K.pending, [
      { billId: 'HD90000003', tableId: 'A5', method: 'temp', openedAt: mins(55), createdAt: mins(4), items: [it('m06', 1), it('m16', 4), it('m22', 1)], total: 289000 + 4 * 30000 + 49000 }
    ]);
    const h = (billId, tableId, items, method, paidAt, extra = {}) => ({ billId, tableId, items, total: calcTotal(items), method, paidAt, ...extra });
    write(K.history, [
      h('HD80000008', 'A1', [it('m04', 2), it('m12', 2)], 'transfer', ago(0, 11, 42)),
      h('HD80000007', 'C2', [it('m10', 1), it('m02', 1), it('m11', 2)], 'cash', ago(0, 10, 5), { received: 500000, change: 500000 - (159000 + 119000 + 40000) }),
      h('HD80000006', 'B4', [it('m03', 2), it('m19', 2)], 'transfer', ago(1, 20, 15)),
      h('HD80000005', 'A2', [it('m05', 1), it('m21', 3), it('m16', 5)], 'cash', ago(1, 19, 30), { received: 350000, change: 350000 - (139000 + 30000 + 150000) }),
      h('HD80000004', 'B1', [it('m13', 4), it('m18', 2)], 'cash', ago(2, 15, 10), { received: 250000, change: 250000 - (140000 + 78000) }),
      h('HD80000003', 'C4', [it('m06', 1), it('m08', 2), it('m14', 3)], 'transfer', ago(3, 18, 50)),
      h('HD80000002', 'A6', [it('m01', 3), it('m15', 3)], 'cash', ago(5, 12, 20), { received: 600000, change: 600000 - (387000 + 144000) }),
      h('HD80000001', 'B3', [it('m07', 2), it('m17', 2)], 'cash', ago(6, 9, 45), { received: 200000, change: 200000 - (138000 + 58000) })
    ]);
    localStorage.setItem(K.seeded, '1');
  }
  seed();

  return {
    calcTotal, getOrders, getOrder, saveOrder,
    getPending, getPendingByTable, moveToPending,
    getBill, payBill, getHistory, getTableStatus,
    isMockPaid, setMockPaid, checkTransferPaid,
    reset() { Object.values(K).forEach((k) => localStorage.removeItem(k)); location.reload(); }
  };
})();
