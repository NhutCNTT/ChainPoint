(async () => {
  await Store.ready;
  const tabsEl = document.getElementById('area-tabs');
  const gridEl = document.getElementById('table-grid');
  const metricsEl = document.getElementById('status-metrics');
  const summaryEl = document.getElementById('table-summary');
  const searchInput = document.getElementById('table-search');
  const clearSearchBtn = document.getElementById('clear-table-search');
  const refreshBtn = document.getElementById('refresh-tables');
  const profileBtn = document.getElementById('cashier-profile');

  let activeArea = sessionStorage.getItem('pos.area') || 'all';
  let activeStatus = 'all';
  let searchTerm = '';

  const statusLabel = { free: 'Trống', busy: 'Đang dùng', pending: 'Chờ thanh toán' };
  const statusAction = {
    free: { label: '＋ Tạo đơn', action: 'order' },
    busy: { label: 'Xem order', action: 'order' },
    pending: { label: 'Xem order', action: 'order' }
  };

  const getStorage = (key) => sessionStorage.getItem(key) || localStorage.getItem(key);
  const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

  function getAllAreas() {
    const map = new Map();
    AREAS.forEach((area) => map.set(area.id, { id: area.id, name: area.name }));
    TABLES.forEach((table) => {
      if (!map.has(table.area)) map.set(table.area, { id: table.area, name: table.area });
    });
    return [...map.values()];
  }

  function getBillId(tableId) {
    const pending = Store.getPendingByTable(tableId);
    if (pending) return pending.billId;
    const order = Store.getOrder(tableId);
    return order ? order.billId : '';
  }

  function populateSession() {
    const branch = getStorage('cp_branch') || 'Chi nhánh hiện tại';
    const user = getStorage('cp_user') || 'Thu ngân';
    const rawRole = String(getStorage('cp_role') || 'cashier').trim().toLowerCase().replace(/^role_/, '');
    const roleAliases = { employee: 'cashier', pos: 'cashier', branch: 'manager' };
    const role = roleAliases[rawRole] || rawRole;
    const roleLabel = role === 'owner'
      ? 'Chủ chuỗi hệ thống'
      : role === 'manager'
        ? 'Quản lý chi nhánh'
        : 'Thu ngân POS';

    const branchEl = document.getElementById('current-branch');
    const cashierEl = document.getElementById('current-cashier');
    const roleEl = document.getElementById('current-cashier-role');
    const avatarEl = document.getElementById('current-cashier-avatar');

    if (branchEl) branchEl.textContent = branch;
    if (cashierEl) cashierEl.textContent = user;
    if (roleEl) roleEl.textContent = roleLabel;
    if (avatarEl) avatarEl.textContent = user.charAt(0).toUpperCase();
  }

  function renderTabs() {
    const areas = getAllAreas();
    if (activeArea !== 'all' && !areas.some((area) => area.id === activeArea)) {
      activeArea = 'all';
    }

    const tabs = [{ id: 'all', name: 'Tất cả' }, ...areas];
    tabsEl.innerHTML = tabs.map((area) => `
      <button id="area-${UI.escapeHtml(area.id)}" class="area-tab ${area.id === activeArea ? 'active' : ''}"
        role="tab" aria-selected="${area.id === activeArea}" data-area="${UI.escapeHtml(area.id)}" type="button">
        ${UI.escapeHtml(area.name)}
      </button>`).join('');
  }

  function updateMetrics() {
    const counts = { free: 0, busy: 0, pending: 0 };
    TABLES.forEach((table) => {
      counts[Store.getTableStatus(table.id).status] += 1;
    });

    const allEl = document.getElementById('count-all');
    if (allEl) allEl.textContent = TABLES.length;
    Object.entries(counts).forEach(([status, count]) => {
      const el = document.getElementById('count-' + status);
      if (el) el.textContent = count;
    });
  }

  function syncMetricChips() {
    if (!metricsEl) return;
    metricsEl.querySelectorAll('[data-status-filter]').forEach((button) => {
      const isActive = button.dataset.statusFilter === activeStatus;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function tableCode(table) {
    const digits = String(table.name || '').match(/\d+/g);
    if (digits && digits.length) return digits[digits.length - 1].slice(-2);
    return String(table.id || '').slice(-2).toUpperCase();
  }

  function card(table, status, index) {
    const billId = getBillId(table.id);
    const since = status.openedAt ? ` data-since="${UI.escapeHtml(status.openedAt)}"` : '';
    const timer = status.status === 'free'
      ? ''
      : `<span class="live-timer" data-live-timer${since}>${UI.minutesAgo(status.openedAt)}</span>`;

    let body = '';
    if (status.status === 'free') {
      body = `
        <div class="table-empty-note">
          <span class="table-empty-icon">✓</span>
          <div><strong>Sẵn sàng đón khách</strong><small>Chạm để tạo order mới</small></div>
        </div>`;
    } else if (status.status === 'busy') {
      body = `
        <div class="table-order-row"><span class="order-count">${status.count} món</span>${timer}</div>
        <div class="table-total-row"><small>Tạm tính</small><strong class="money">${UI.formatVND(status.total)}</strong></div>`;
    } else {
      body = `
        <div class="table-order-row"><span class="order-count">${status.count} món đã gọi</span>${timer}</div>
        <div class="table-total-row"><small>Bill chờ thu</small><strong class="money">${UI.formatVND(status.total)}</strong></div>`;
    }

    const primaryAction = statusAction[status.status];
    const primaryButton = `<button class="quick-action ${status.status === 'free' ? 'quick-primary' : ''}"
      type="button" data-action="${primaryAction.action}" data-table="${UI.escapeHtml(table.id)}">${primaryAction.label}</button>`;
    const payButton = status.status !== 'free' && billId
      ? `<button class="quick-action quick-primary" type="button" data-action="pay" data-table="${UI.escapeHtml(table.id)}">${status.status === 'pending' ? 'Thu tiền' : 'Thanh toán'}</button>`
      : '';

    return `
      <article id="table-${UI.escapeHtml(table.id)}" class="table-card status-${status.status}"
        data-table="${UI.escapeHtml(table.id)}" role="button" tabindex="0"
        style="animation-delay:${index * 22}ms"
        aria-label="${UI.escapeHtml(table.name)} · ${statusLabel[status.status]}${status.total ? ' · ' + UI.formatVND(status.total) : ''}">
        <div class="table-card-head">
          <div class="table-identity">
            <span class="table-avatar">${UI.escapeHtml(tableCode(table))}</span>
            <div>
              <h3 class="table-name">${UI.escapeHtml(table.name)}</h3>
              <p class="table-meta"><span>👤 ${table.seats} chỗ</span><span class="meta-dot"></span><span>${UI.escapeHtml(table.area)}</span></p>
            </div>
          </div>
          <span class="status-pill"><i></i>${statusLabel[status.status]}</span>
        </div>
        <div class="table-body">${body}</div>
        <div class="table-quick-actions">${primaryButton}${payButton}</div>
      </article>`;
  }

  function renderGrid() {
    updateMetrics();
    syncMetricChips();

    if (!TABLES.length) {
      if (summaryEl) summaryEl.textContent = 'Chưa có bàn ăn nào trong cơ sở dữ liệu.';
      gridEl.innerHTML = `
        <div class="empty-state">
          <div class="big">🍽️</div>
          <h3>Chưa có bàn ăn</h3>
          <p>Hãy cấu hình vị trí bàn cho chi nhánh rồi quay lại màn hình thu ngân.</p>
          <a class="btn" href="../pages/branch/tables.html">Cấu hình bàn</a>
        </div>`;
      return;
    }

    const query = normalizeText(searchTerm);
    const visibleTables = TABLES.filter((table) => {
      if (activeArea !== 'all' && table.area !== activeArea) return false;
      const status = Store.getTableStatus(table.id);
      if (activeStatus !== 'all' && status.status !== activeStatus) return false;
      if (!query) return true;
      return normalizeText(`${table.name} ${table.id} ${table.area}`).includes(query);
    });

    if (summaryEl) {
      const areaName = activeArea === 'all'
        ? 'Tất cả khu vực'
        : (getAllAreas().find((area) => area.id === activeArea) || { name: activeArea }).name;
      const filterLabel = activeStatus === 'all' ? '' : ` · ${statusLabel[activeStatus]}`;
      summaryEl.textContent = `${visibleTables.length}/${TABLES.length} bàn · ${areaName}${filterLabel}`;
    }

    if (!visibleTables.length) {
      gridEl.innerHTML = `
        <div class="empty-state">
          <div class="big">🔎</div>
          <h3>Không tìm thấy bàn phù hợp</h3>
          <p>Thử đổi khu vực, trạng thái hoặc từ khóa tìm kiếm.</p>
          <button class="btn" type="button" data-clear-filters>Xóa bộ lọc</button>
        </div>`;
      return;
    }

    const areas = getAllAreas();
    let html = '';
    let index = 0;

    areas.forEach((area) => {
      const tables = visibleTables.filter((table) => table.area === area.id);
      if (!tables.length) return;

      if (activeArea === 'all') {
        html += `<h2 class="area-title"><span>${UI.escapeHtml(area.name)}</span><small>${tables.length} bàn</small></h2>`;
      }

      tables.forEach((table) => {
        html += card(table, Store.getTableStatus(table.id), index++);
      });
    });

    gridEl.innerHTML = html;
  }

  function clearSearch() {
    searchTerm = '';
    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.hidden = true;
    renderGrid();
  }

  function resetFilters() {
    activeArea = 'all';
    activeStatus = 'all';
    sessionStorage.setItem('pos.area', activeArea);
    clearSearch();
    renderTabs();
  }

  function refreshTimers() {
    gridEl.querySelectorAll('[data-live-timer]').forEach((el) => {
      if (el.dataset.since) el.textContent = UI.minutesAgo(el.dataset.since);
    });
  }

  function handleAction(action, tableId) {
    if (!tableId) return;
    if (action === 'pay') {
      const billId = getBillId(tableId);
      if (billId) {
        location.href = 'payment.html?bill=' + encodeURIComponent(billId);
        return;
      }
    }
    location.href = 'order.html?table=' + encodeURIComponent(tableId);
  }

  tabsEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-area]');
    if (!button) return;
    activeArea = button.dataset.area;
    sessionStorage.setItem('pos.area', activeArea);
    renderTabs();
    renderGrid();
  });

  metricsEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-status-filter]');
    if (!button) return;
    activeStatus = button.dataset.statusFilter || 'all';
    syncMetricChips();
    renderGrid();
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchTerm = searchInput.value;
      if (clearSearchBtn) clearSearchBtn.hidden = !searchTerm;
      renderGrid();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      clearSearch();
      if (searchInput) searchInput.focus();
    });
  }

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
      event.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      return;
    }
    if (event.key === 'Escape' && document.activeElement === searchInput) {
      clearSearch();
      searchInput.blur();
    }
  });

  gridEl.addEventListener('click', (event) => {
    if (event.target.closest('[data-clear-filters]')) {
      resetFilters();
      return;
    }

    const actionButton = event.target.closest('[data-action]');
    if (actionButton) {
      event.preventDefault();
      event.stopPropagation();
      handleAction(actionButton.dataset.action, actionButton.dataset.table);
      return;
    }

    const cardEl = event.target.closest('[data-table]');
    if (!cardEl) return;
    location.href = 'order.html?table=' + encodeURIComponent(cardEl.dataset.table);
  });

  gridEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.closest('button')) return;
    const cardEl = event.target.closest('[data-table]');
    if (!cardEl) return;
    event.preventDefault();
    location.href = 'order.html?table=' + encodeURIComponent(cardEl.dataset.table);
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.classList.add('is-loading');
      try {
        if (window.refreshPosData) await Promise.all([window.refreshPosData(), Store.refresh()]);
        renderTabs();
        renderGrid();
        UI.refreshPendingBadge();
        UI.toast('Đã làm mới dữ liệu bàn');
      } catch (error) {
        UI.toast('Không thể làm mới dữ liệu bàn', 'error');
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('is-loading');
      }
    });
  }

  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      const trigger = document.getElementById('btn-hamburger');
      if (trigger) trigger.click();
    });
  }

  populateSession();
  UI.initDrawer('tables');
  UI.initClock();
  UI.refreshPendingBadge();

  if (window.POS_DATA_READY) {
    await window.POS_DATA_READY;
  }

  renderTabs();
  renderGrid();

  const timer = setInterval(() => {
    refreshTimers();
    UI.refreshPendingBadge();
  }, 30000);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
})();
