(() => {
  const tabsEl = document.getElementById('area-tabs');
  const gridEl = document.getElementById('table-grid');
  let activeArea = sessionStorage.getItem('pos.area') || 'all';

  const statusLabel = { free: 'Trống', busy: 'Đang dùng', pending: 'Chờ thanh toán' };

  function renderTabs() {
    const tabs = [{ id: 'all', name: 'Tất cả' }, ...AREAS];
    tabsEl.innerHTML = tabs.map((a) =>
      `<button id="area-${a.id}" class="area-tab ${a.id === activeArea ? 'active' : ''}" role="tab" data-area="${a.id}" type="button">${a.name}</button>`).join('');
  }

  function card(t, st, i) {
    const meta = st.status === 'free'
      ? `${t.seats} chỗ ngồi`
      : `${st.count} món · ${UI.minutesAgo(st.openedAt)} trước`;
    return `
      <button id="table-${t.id}" class="table-card ${st.status}" data-table="${t.id}" type="button" style="animation-delay:${i * 25}ms">
        <span class="table-name">${t.name}</span>
        <span class="table-meta">${meta}</span>
        <span class="table-foot">
          <span class="badge badge-${st.status}">${statusLabel[st.status]}</span>
          ${st.total ? `<span class="table-total money">${UI.formatVND(st.total)}</span>` : ''}
        </span>
      </button>`;
  }

  function renderGrid() {
    const counts = { free: 0, busy: 0, pending: 0 };
    TABLES.forEach((t) => counts[Store.getTableStatus(t.id).status]++);
    Object.keys(counts).forEach((k) => (document.getElementById('count-' + k).textContent = counts[k]));

    let html = '', n = 0;
    const areas = activeArea === 'all' ? AREAS : AREAS.filter((a) => a.id === activeArea);
    areas.forEach((a) => {
      if (activeArea === 'all') html += `<h2 class="area-title">${a.name}</h2>`;
      TABLES.filter((t) => t.area === a.id).forEach((t) => { html += card(t, Store.getTableStatus(t.id), n++); });
    });
    gridEl.innerHTML = html;
  }

  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-area]'); if (!b) return;
    activeArea = b.dataset.area; sessionStorage.setItem('pos.area', activeArea);
    renderTabs(); renderGrid();
  });
  gridEl.addEventListener('click', (e) => {
    const c = e.target.closest('[data-table]'); if (!c) return;
    location.href = 'order.html?table=' + encodeURIComponent(c.dataset.table);
  });

  UI.initDrawer('tables');
  UI.initClock();
  UI.refreshPendingBadge();
  renderTabs(); renderGrid();
})();
