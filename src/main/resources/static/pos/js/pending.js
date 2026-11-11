(() => {
  const listEl = document.getElementById('bill-list');
  const methodLabel = { temp: 'Tạm tính', transfer: 'Chuyển khoản chờ' };

  function render() {
    const bills = Store.getPending().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    if (!bills.length) {
      listEl.style.display = 'block';
      listEl.innerHTML = `<div class="empty-state"><div class="big">🧾</div><h2>Chưa có bill chờ thanh toán</h2><p>Bill tạm tính hoặc chuyển khoản chờ sẽ xuất hiện ở đây.</p></div>`;
      return;
    }
    listEl.style.display = '';
    listEl.innerHTML = bills.map((b, i) => {
      const t = getTable(b.tableId);
      const shown = b.items.slice(0, 3);
      const rest = b.items.length - shown.length;
      return `
      <article class="bill-card ${b.method === 'transfer' ? 'transfer' : ''}" id="bill-${b.billId}" style="animation-delay:${i * 50}ms">
        <div class="bill-top">
          <div><div class="bill-table">${t ? t.name : b.tableId}</div><div class="bill-id">#${b.billId} · ${UI.formatTime(b.createdAt)} · ${UI.minutesAgo(b.createdAt)} trước</div></div>
          <span class="badge ${b.method === 'transfer' ? 'badge-transfer' : 'badge-pending'}">${methodLabel[b.method] || 'Tạm tính'}</span>
        </div>
        <ul class="bill-items">
          ${shown.map((it) => `<li><span>${it.qty}× ${UI.escapeHtml(it.name)}</span><span>${UI.formatVND(it.price * it.qty)}</span></li>`).join('')}
          ${rest > 0 ? `<li class="more">+ ${rest} món khác…</li>` : ''}
        </ul>
        <div class="bill-total"><span>Tổng cộng</span><span class="money">${UI.formatVND(b.total)}</span></div>
        <div class="bill-actions">
          <a id="edit-${b.billId}" class="btn" href="order.html?table=${encodeURIComponent(b.tableId)}">✏️ Xem / Sửa</a>
          <a id="pay-${b.billId}" class="btn btn-primary" href="payment.html?bill=${b.billId}">💳 Thanh toán</a>
        </div>
      </article>`;
    }).join('');
  }

  UI.initDrawer('pending');
  UI.initClock();
  UI.refreshPendingBadge();
  render();
})();
