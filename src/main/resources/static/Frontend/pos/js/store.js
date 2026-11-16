/* ChainPoint — POS Store
 * Quản lý phiên gọi món trên bàn & gửi đơn hàng thanh toán vào MySQL Database qua Backend API
 */

const Store = (() => {
  // Bộ nhớ in-memory cho phiên làm việc hiện tại của POS
  let sessionOrders = {};
  let sessionPending = [];
  let cachedHistory = [];

  const calcTotal = (items) => items.reduce((s, i) => s + i.price * i.qty, 0);
  const newBillId = () => 'HD' + Date.now().toString().slice(-8);

  /* ---------- Orders (bàn đang dùng) ---------- */
  const getOrders = () => sessionOrders;
  const getOrder = (tableId) => sessionOrders[tableId] || null;

  function saveOrder(tableId, items) {
    const pend = sessionPending.find((p) => p.tableId === tableId);
    const base = sessionOrders[tableId] || pend || {};
    if (!items.length) {
      delete sessionOrders[tableId];
      sessionPending = sessionPending.filter((p) => p.tableId !== tableId);
      return null;
    }
    const order = {
      billId: base.billId || newBillId(),
      tableId,
      items: items.map((i) => ({ ...i })),
      openedAt: base.openedAt || new Date().toISOString()
    };
    sessionOrders[tableId] = order;
    if (pend) {
      sessionPending = sessionPending.filter((p) => p.tableId !== tableId);
    }
    return order;
  }

  /* ---------- Pending (chờ thanh toán) ---------- */
  const getPending = () => sessionPending;
  const getPendingByTable = (tableId) => sessionPending.find((p) => p.tableId === tableId) || null;

  function moveToPending(billId, method) {
    const entry = Object.values(sessionOrders).find((o) => o.billId === billId);
    const existing = sessionPending.find((p) => p.billId === billId);
    if (entry) {
      delete sessionOrders[entry.tableId];
      sessionPending.push({ ...entry, total: calcTotal(entry.items), method, createdAt: new Date().toISOString() });
    } else if (existing) {
      existing.method = method;
    } else return false;
    return true;
  }

  /* ---------- Bill (lấy từ order hoặc pending) ---------- */
  function getBill(billId) {
    const p = sessionPending.find((x) => x.billId === billId);
    if (p) return { ...p, total: calcTotal(p.items), source: 'pending' };
    const o = Object.values(sessionOrders).find((x) => x.billId === billId);
    if (o) return { ...o, total: calcTotal(o.items), source: 'order' };
    return null;
  }

  /* ---------- Thanh toán & Đẩy dữ liệu vào MySQL Database ---------- */
  async function payBill(billId, method, extra = {}) {
    const bill = getBill(billId);
    if (!bill) return null;

    delete sessionOrders[bill.tableId];
    sessionPending = sessionPending.filter((p) => p.billId !== billId);

    const record = {
      billId,
      tableId: bill.tableId,
      items: bill.items,
      total: bill.total,
      method,
      paidAt: new Date().toISOString(),
      ...extra
    };
    cachedHistory.unshift(record);

    // Gửi dữ liệu thanh toán lưu trực tiếp vào cơ sở dữ liệu MySQL Backend
    try {
      const cashierUser = sessionStorage.getItem('cp_user') || 'Thu ngân';
      const branchId = Number(sessionStorage.getItem('cp_branch_id')) || null;

      // Ánh xạ items sang định dạng Backend DTO
      const checkoutItems = bill.items.map(item => {
        let pId = item.realId;
        if (!pId && item.id && item.id.startsWith('m')) {
          pId = parseInt(item.id.replace('m', ''), 10) || 1;
        }
        return {
          productId: pId || 1,
          quantity: item.qty || 1
        };
      });

      const payload = {
        branchId: branchId,
        tableCode: bill.tableId,
        cashierUsername: cashierUser,
        customerPhone: extra.customerPhone || null,
        paymentMethod: method === 'transfer' ? 'transfer' : 'cash',
        pointsToUse: extra.pointsUsed ? Number(extra.pointsUsed) : 0,
        items: checkoutItems
      };

      const checkoutUrl = (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '')
        ? 'http://localhost:8080/api/v1/pos/checkout'
        : ((typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? `${window.location.origin}/api/v1/pos/checkout` : 'http://localhost:8080/api/v1/pos/checkout');

      const res = await fetch(checkoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const backendBill = await res.json();
        console.log('Đã lưu hóa đơn vào MySQL & phát sinh giao dịch Blockchain:', backendBill);
        record.billId = backendBill.billCode || record.billId;
        record.billHash = backendBill.billHash;
        record.blockchainTxHash = backendBill.blockchainTxHash;
      }
    } catch (err) {
      console.warn('Lỗi khi gửi hóa đơn lên Backend MySQL:', err);
    }

    return record;
  }

  // Tải lịch sử đơn hàng từ Backend MySQL
  async function fetchHistoryFromDatabase() {
    try {
      const res = await fetch('http://localhost:8080/api/v1/orders');
      if (res.ok) {
        const list = await res.json();
        cachedHistory = list.map(b => ({
          billId: b.billCode,
          tableId: b.tableCode,
          items: (b.items || []).map(i => ({
            id: i.productId,
            name: i.productName,
            price: i.unitPrice,
            qty: i.quantity
          })),
          total: b.grossAmount,
          method: b.paymentMethod,
          paidAt: b.createdAt
        }));
      }
    } catch (e) {
      console.warn('Không thể tải lịch sử hóa đơn từ MySQL:', e);
    }
  }

  fetchHistoryFromDatabase();

  const getHistory = () => cachedHistory;

  /* ---------- Trạng thái bàn ---------- */
  function getTableStatus(tableId) {
    const p = getPendingByTable(tableId);
    if (p) return { status: 'pending', total: calcTotal(p.items), count: p.items.reduce((s, i) => s + i.qty, 0), openedAt: p.openedAt };
    const o = getOrder(tableId);
    if (o) return { status: 'busy', total: calcTotal(o.items), count: o.items.reduce((s, i) => s + i.qty, 0), openedAt: o.openedAt };
    return { status: 'free', total: 0, count: 0 };
  }

  /* ---------- Giả lập kiểm tra giao dịch chuyển khoản VietQR ---------- */
  let mockPaidMap = {};
  const isMockPaid = (billId) => !!mockPaidMap[billId];
  function setMockPaid(billId, v) { if (v) mockPaidMap[billId] = true; else delete mockPaidMap[billId]; }
  const checkTransferPaid = (billId) => new Promise((res) => setTimeout(() => res(isMockPaid(billId)), 1000));

  return {
    calcTotal, getOrders, getOrder, saveOrder,
    getPending, getPendingByTable, moveToPending,
    getBill, payBill, getHistory, getTableStatus,
    isMockPaid, setMockPaid, checkTransferPaid,
    reset() { sessionOrders = {}; sessionPending = []; cachedHistory = []; location.reload(); }
  };
})();
