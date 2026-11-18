(() => {
  const $ = (id) => document.getElementById(id);
  const fromEl = $('date-from'), toEl = $('date-to');
  const listEl = $('history-list'), detailEl = $('history-detail');
  let selected = null;

  const pad = (n) => String(n).padStart(2, '0');
  const key = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const methodLabel = { cash: 'Tiền mặt', transfer: 'Chuyển khoản' };

  function setRange(from, to, btnId) {
    fromEl.value = from; toEl.value = to;
    ['btn-today', 'btn-7days', 'btn-all'].forEach((id) => $(id).classList.toggle('active', id === btnId));
    render();
  }

  function filtered() {
    const from = fromEl.value, to = toEl.value;
    return Store.getHistory()
      .filter((h) => { const k = UI.toDateKey(h.paidAt); return (!from || k >= from) && (!to || k <= to); })
      .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  }

  function renderStats(rows) {
    const sum = (m) => rows.filter((r) => !m || r.method === m).reduce((s, r) => s + r.total, 0);
    $('stat-count').textContent = rows.length;
    $('stat-cash').textContent = UI.formatVND(sum('cash'));
    $('stat-transfer').textContent = UI.formatVND(sum('transfer'));
    $('stat-total').textContent = UI.formatVND(sum());
  }

  function renderDetail() {
    const h = Store.getHistory().find((x) => x.billId === selected);
    if (!h) { detailEl.innerHTML = `<div class="empty-state"><div class="big">📄</div><p>Chọn một hóa đơn để xem chi tiết</p></div>`; return; }
    const t = getTable(h.tableId);
    detailEl.innerHTML = `
      <div class="d-head">
        <div><h2>${t ? t.name : h.tableId}</h2><small>#${h.billId} · ${UI.formatDate(h.paidAt)} ${UI.formatTime(h.paidAt)}</small></div>
        <span class="badge badge-${h.method}">${methodLabel[h.method]}</span>
      </div>
      <div class="d-items sum-list">
        ${h.items.map((i) => `
          <div class="sum-row">
            <span class="sum-name">${UI.escapeHtml(i.name)}${i.note ? `<span class="sum-note">📝 ${UI.escapeHtml(i.note)}</span>` : ''}</span>
            <span class="sum-qty">${i.qty} × ${UI.formatVND(i.price)}</span>
            <span class="sum-line money">${UI.formatVND(i.price * i.qty)}</span>
          </div>`).join('')}
      </div>
      <div class="d-pay">
        ${h.method === 'cash' ? `<div><span>Khách đưa</span><b>${UI.formatVND(h.received)}</b></div><div><span>Tiền thối</span><b>${UI.formatVND(h.change)}</b></div>` : ''}
        <div class="grand"><span>Tổng thanh toán</span><span class="money">${UI.formatVND(h.total)}</span></div>
      </div>`;
  }

  function render() {
    const rows = filtered();
    renderStats(rows);
    if (!rows.find((r) => r.billId === selected)) selected = rows.length ? rows[0].billId : null;
    if (!rows.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="big">📭</div><h2>Không có hóa đơn</h2><p>Không có hóa đơn nào trong khoảng ngày đã chọn.</p></div>`;
    } else {
      listEl.innerHTML = rows.map((h, i) => {
        const t = getTable(h.tableId);
        return `
        <button id="row-${h.billId}" class="h-row ${h.billId === selected ? 'active' : ''}" data-bill="${h.billId}" type="button" style="animation-delay:${i * 30}ms">
          <span class="h-table">${t ? t.name : h.tableId}</span>
          <span class="h-info"><b>#${h.billId}</b><small>${UI.formatDate(h.paidAt)} · ${UI.formatTime(h.paidAt)} · ${h.items.reduce((s, x) => s + x.qty, 0)} món</small></span>
          <span class="badge badge-${h.method}">${methodLabel[h.method]}</span>
          <span class="h-total money">${UI.formatVND(h.total)}</span>
        </button>`;
      }).join('');
    }
    renderDetail();
  }

  listEl.addEventListener('click', (e) => {
    const r = e.target.closest('[data-bill]'); if (!r) return;
    selected = r.dataset.bill;
    listEl.querySelectorAll('.h-row').forEach((x) => x.classList.toggle('active', x.dataset.bill === selected));
    renderDetail();
  });

  const clearActive = () => ['btn-today', 'btn-7days', 'btn-all'].forEach((id) => $(id).classList.remove('active'));
  fromEl.addEventListener('change', () => { clearActive(); render(); });
  toEl.addEventListener('change', () => { clearActive(); render(); });
  $('btn-today').addEventListener('click', () => setRange(key(new Date()), key(new Date()), 'btn-today'));
  $('btn-7days').addEventListener('click', () => { const d = new Date(); d.setDate(d.getDate() - 6); setRange(key(d), key(new Date()), 'btn-7days'); });
  $('btn-all').addEventListener('click', () => setRange('', '', 'btn-all'));

  UI.initDrawer('history');
  UI.refreshPendingBadge();
  setRange(key(new Date()), key(new Date()), 'btn-today');
})();
