/* ChainPoint — POS Store
 * Quản lý phiên gọi món trên bàn & gửi đơn hàng thanh toán vào MySQL Database qua Backend API
 */

const Store = (() => {
  const STORAGE_ORDERS_KEY = 'cp_pos_session_orders';
  const STORAGE_PENDING_KEY = 'cp_pos_session_pending';

  function loadSessionState(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveSessionState(key, val) {
    try {
      sessionStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  let sessionOrders = loadSessionState(STORAGE_ORDERS_KEY, {});
  let sessionPending = loadSessionState(STORAGE_PENDING_KEY, []);
  let cachedHistory = [];

  const getApiBase = () => {
    if (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '') {
      return 'http://localhost:8080/api/v1';
    }
    if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
      return `${window.location.origin}/api/v1`;
    }
    return 'http://localhost:8080/api/v1';
  };

  const getAuthHeaders = (extra = {}) => {
    const token = sessionStorage.getItem('cp_token') || localStorage.getItem('cp_token') || '';
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra
    };
  };

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
      saveSessionState(STORAGE_ORDERS_KEY, sessionOrders);
      saveSessionState(STORAGE_PENDING_KEY, sessionPending);
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
    saveSessionState(STORAGE_ORDERS_KEY, sessionOrders);
    saveSessionState(STORAGE_PENDING_KEY, sessionPending);
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
    saveSessionState(STORAGE_ORDERS_KEY, sessionOrders);
    saveSessionState(STORAGE_PENDING_KEY, sessionPending);
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

    const record = {
      billId,
      tableId: bill.tableId,
      items: bill.items,
      total: extra.paidAmount != null ? Number(extra.paidAmount) : bill.total,
      grossAmount: bill.grossTotal || bill.total,
      discountVND: Number(extra.discountVND || 0),
      pointsUsed: Number(extra.pointsUsed || 0),
      pointsEarned: 0,
      method,
      paidAt: new Date().toISOString(),
      ...extra
    };

    const apiBase = getApiBase();
    const cashierUser = sessionStorage.getItem('cp_user') || localStorage.getItem('cp_user') || 'Thu ngân';
    let branchId = Number(sessionStorage.getItem('cp_branch_id') || localStorage.getItem('cp_branch_id')) || null;

    if (!branchId) {
      try {
        const bRes = await fetch(`${apiBase}/branches`, { headers: getAuthHeaders() });
        if (bRes.ok) {
          const branches = await bRes.json();
          if (Array.isArray(branches) && branches.length > 0) {
            branchId = branches[0].id;
            sessionStorage.setItem('cp_branch_id', branchId);
          }
        }
      } catch (ignored) {}
    }

    const checkoutItems = bill.items.map(item => {
      let pId = item.realId;
      if (!pId && typeof getMenuItem === 'function') {
        const menuObj = getMenuItem(item.id);
        if (menuObj && menuObj.realId) pId = menuObj.realId;
      }
      if (!pId && item.id && String(item.id).startsWith('m')) {
        pId = parseInt(String(item.id).replace('m', ''), 10) || 1;
      }
      return {
        productId: Number(pId) || 1,
        quantity: Number(item.qty) || 1
      };
    });

    const customerPhone = extra.customerPhone || extra.phone || null;

    const payload = {
      branchId: branchId || 1,
      tableCode: bill.tableId,
      cashierUsername: cashierUser,
      customerPhone: customerPhone,
      paymentMethod: method === 'transfer' ? 'transfer' : 'cash',
      pointsToUse: extra.pointsUsed ? Number(extra.pointsUsed) : 0,
      items: checkoutItems
    };

    const res = await fetch(`${apiBase}/pos/checkout`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || `Lỗi thanh toán (${res.status}): Không thể lưu hóa đơn vào Database.`);
    }

    const backendBill = await res.json();
    record.billId = backendBill.billCode || record.billId;
    record.grossAmount = Number(backendBill.grossAmount ?? record.grossAmount);
    record.discountVND = Number(backendBill.discountAmount ?? record.discountVND);
    record.pointsUsed = Number(backendBill.pointsUsed ?? record.pointsUsed);
    record.pointsEarned = Number(backendBill.pointsEarned ?? 0);
    record.total = Number(backendBill.finalAmount ?? record.total);
    record.billHash = backendBill.billHash;
    record.blockchainTxHash = backendBill.blockchainTxHash;
    record.paidAt = backendBill.createdAt || record.paidAt;

    // Chỉ xóa giỏ hàng sau khi Database lưu hóa đơn thành công
    delete sessionOrders[bill.tableId];
    sessionPending = sessionPending.filter((p) => p.billId !== billId);
    saveSessionState(STORAGE_ORDERS_KEY, sessionOrders);
    saveSessionState(STORAGE_PENDING_KEY, sessionPending);

    cachedHistory.unshift(record);
    if (window.LoyaltyStore && LoyaltyStore.refreshCustomers) {
      LoyaltyStore.refreshCustomers(true);
    }
    return record;
  }

  // Tải lịch sử đơn hàng từ Backend MySQL
  async function fetchHistoryFromDatabase() {
    try {
      const apiBase = getApiBase();
      const branchId = sessionStorage.getItem('cp_branch_id') || localStorage.getItem('cp_branch_id') || '';
      const url = branchId ? `${apiBase}/orders?branchId=${branchId}` : `${apiBase}/orders`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const list = await res.json();
        cachedHistory = (Array.isArray(list) ? list : []).map(b => ({
          billId: b.billCode,
          tableId: b.tableCode,
          items: (b.items || []).map(i => ({
            id: i.productId,
            name: i.productName,
            price: Number(i.unitPrice || 0),
            qty: Number(i.quantity || 1)
          })),
          grossAmount: Number(b.grossAmount || 0),
          discountVND: Number(b.discountAmount || 0),
          pointsUsed: Number(b.pointsUsed || 0),
          pointsEarned: Number(b.pointsEarned || 0),
          total: Number(b.finalAmount ?? b.grossAmount ?? 0),
          method: b.paymentMethod || 'cash',
          paidAt: b.createdAt
        }));
      }
    } catch (e) {
      console.warn('Không thể tải lịch sử hóa đơn từ MySQL:', e);
    }
    return cachedHistory;
  }

  const historyReadyPromise = fetchHistoryFromDatabase();

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
    ready: historyReadyPromise,
    refreshHistory: fetchHistoryFromDatabase,
    calcTotal, getOrders, getOrder, saveOrder,
    getPending, getPendingByTable, moveToPending,
    getBill, payBill, getHistory, getTableStatus,
    isMockPaid, setMockPaid, checkTransferPaid,
    reset() {
      sessionOrders = {};
      sessionPending = [];
      saveSessionState(STORAGE_ORDERS_KEY, sessionOrders);
      saveSessionState(STORAGE_PENDING_KEY, sessionPending);
      location.reload();
    }
  };
})();
