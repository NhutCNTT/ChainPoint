(function applyRoleTheme() {
  try {
    const storedRole = sessionStorage.getItem('cp_role') || localStorage.getItem('cp_role') || 'cashier';
    const normalized = String(storedRole).trim().toLowerCase().replace(/^role_/, '');
    const aliases = { employee: 'cashier', pos: 'cashier', branch: 'manager' };
    const role = aliases[normalized] || normalized;
    const activeRole = ['owner', 'manager', 'cashier'].includes(role) ? role : 'cashier';
    document.documentElement.setAttribute('data-role', activeRole);
    if (document.body) {
      document.body.setAttribute('data-role', activeRole);
    }
  } catch (error) {
    console.warn('[Theme] Unable to apply role theme:', error);
  }
})();

/* Tiện ích dùng chung: định dạng, toast, modal, drawer, badge chờ thanh toán */
const UI = (() => {
  const formatVND = (n) => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
  const pad = (n) => String(n).padStart(2, '0');
  const formatTime = (iso) => { const d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const formatClock = (value = new Date()) => { const d = new Date(value); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
  const formatDate = (iso) => { const d = new Date(iso); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const toDateKey = (iso) => { const d = new Date(iso); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const getParam = (name) => new URLSearchParams(location.search).get(name);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const minutesAgo = (iso) => {
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return 'Vừa xong';
    const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    return m < 60 ? m + ' phút' : Math.floor(m / 60) + 'g ' + (m % 60) + 'p';
  };

  /* ---------- Toast ---------- */
  function toast(message, type = 'success') {
    let wrap = document.getElementById('toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toast-wrap'; wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = (type === 'success' ? '✅ ' : type === 'error' ? '⚠️ ' : 'ℹ️ ') + message;
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2200);
  }

  /* ---------- Modal ----------
   * showModal({ icon, tone, title, message, actions:[{label, cls, onClick}] }) */
  function showModal({ icon = 'ℹ️', tone = '', title, message = '', actions = [] }) {
    closeModal();
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop'; bd.id = 'modal-backdrop';
    bd.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-icon ${tone}">${icon}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${message}</p>
        <div class="modal-actions"></div>
      </div>`;
    const box = bd.querySelector('.modal-actions');
    actions.forEach((a, i) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.cls || ''); b.id = a.id || 'modal-action-' + i; b.textContent = a.label;
      b.addEventListener('click', () => { closeModal(); a.onClick && a.onClick(); });
      box.appendChild(b);
    });
    document.body.appendChild(bd);
    requestAnimationFrame(() => bd.classList.add('open'));
  }
  function closeModal() { const m = document.getElementById('modal-backdrop'); if (m) m.remove(); }

  /* ---------- Drawer (hamburger) ---------- */
  function initDrawer(activeKey) {
    const get = (k) => sessionStorage.getItem(k) || localStorage.getItem(k);
    const storedRole = get('cp_role') || 'cashier';
    const normalizedRole = String(storedRole).trim().toLowerCase().replace(/^role_/, '');
    const roleAliases = { employee: 'cashier', pos: 'cashier', branch: 'manager' };
    const role = ['owner', 'manager', 'cashier'].includes(roleAliases[normalizedRole] || normalizedRole)
      ? (roleAliases[normalizedRole] || normalizedRole)
      : 'cashier';
    const user = get('cp_user') || 'Thu ngân';
    const branch = get('cp_branch') || 'Cửa hàng';

    const roleName = role === 'owner' ? 'Chủ chuỗi hệ thống' : role === 'manager' ? 'Quản lý chi nhánh' : 'Thu ngân POS';

    const overlay = document.createElement('div');
    overlay.className = 'overlay'; overlay.id = 'drawer-overlay';
    const drawer = document.createElement('aside');
    drawer.className = 'drawer'; drawer.id = 'drawer';
    drawer.setAttribute('aria-label', 'Menu chính');

    const isOwner = role === 'owner';
    const isManager = role === 'manager';
    const canAccessAdmin = isOwner || isManager;
    const returnDashboardUrl = '../pages/admin/dashboard.html';
    const pendingCount = typeof Store !== 'undefined' && Store.getPending ? Store.getPending().length : 0;

    drawer.innerHTML = `
      <div class="drawer-head">
        <div class="brand-mark">CP</div>
        <div class="drawer-brand">
          <div class="drawer-title">ChainPoint POS</div>
          <div class="drawer-sub">${escapeHtml(branch)}</div>
        </div>
        <button id="drawer-close" class="drawer-close" type="button" aria-label="Đóng menu">×</button>
      </div>

      <div class="drawer-session">
        <span class="live-dot"></span>
        <div class="drawer-session-copy">
          <strong>${escapeHtml(roleName)}</strong>
          <small>${escapeHtml(user)} · ${escapeHtml(branch)}</small>
        </div>
      </div>

      <div class="drawer-scroll">
        ${canAccessAdmin ? `
          <div class="drawer-section-label">Quản trị</div>
          <a id="menu-admin-back" class="drawer-link" style="background:var(--pending-soft); color:var(--accent-1); font-weight:700;" href="${returnDashboardUrl}"><span class="ico">📊</span><span class="drawer-label">Dashboard tổng quan</span></a>
          <a id="menu-admin-tables" class="drawer-link" href="../pages/branch/tables.html"><span class="ico">📐</span><span class="drawer-label">Cấu hình vị trí bàn</span></a>
        ` : ''}

        <div class="drawer-section-label">Bán hàng</div>
        <a id="menu-tables" class="drawer-link ${activeKey === 'tables' ? 'active' : ''}" href="index.html"><span class="ico">🍽️</span><span class="drawer-label">Chọn bàn / Gọi món</span></a>
        <a id="menu-pending" class="drawer-link ${activeKey === 'pending' ? 'active' : ''}" href="pending.html"><span class="ico">💳</span><span class="drawer-label">Chờ thanh toán</span><b id="drawer-pending-count" class="drawer-badge" data-zero="${pendingCount === 0}">${pendingCount}</b></a>
        <a id="menu-history" class="drawer-link ${activeKey === 'history' ? 'active' : ''}" href="history.html"><span class="ico">🧾</span><span class="drawer-label">Lịch sử hóa đơn</span></a>
        <a id="menu-orders" class="drawer-link" href="../pages/branch/orders.html"><span class="ico">🏬</span><span class="drawer-label">Đơn hàng chi nhánh</span></a>

        <div class="drawer-section-label">Tiện ích</div>
        <button id="menu-reset" class="drawer-link" type="button"><span class="ico">♻️</span><span class="drawer-label">Đặt lại dữ liệu demo</span></button>
      </div>

      <div class="drawer-footer">
        <div class="drawer-user">
          <div class="avatar">${escapeHtml(user.charAt(0).toUpperCase())}</div>
          <div class="drawer-user-copy">
            <strong>${escapeHtml(user)}</strong>
            <small>${escapeHtml(roleName)} · ${escapeHtml(branch)}</small>
          </div>
        </div>
        <button id="menu-logout" class="drawer-logout" type="button">🚪 Đăng xuất</button>
      </div>`;
    document.body.append(overlay, drawer);

    const open = () => {
      overlay.classList.add('open');
      drawer.classList.add('open');
      const trigger = document.getElementById('btn-hamburger');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      overlay.classList.remove('open');
      drawer.classList.remove('open');
      const trigger = document.getElementById('btn-hamburger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    };
    const btn = document.getElementById('btn-hamburger');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', open);
    }
    const closeBtn = drawer.querySelector('#drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    drawer.querySelector('#menu-reset').addEventListener('click', () => {
      showModal({ icon: '♻️', tone: 'warn', title: 'Đặt lại dữ liệu demo?', message: 'Toàn bộ bàn, bill chờ và lịch sử sẽ trở về dữ liệu mẫu ban đầu.',
        actions: [{ label: 'Hủy' }, { label: 'Đặt lại', cls: 'btn-danger', onClick: () => Store.reset() }] });
    });

    const logoutBtn = drawer.querySelector('#menu-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        ['cp_role', 'cp_user', 'cp_branch', 'cp_branch_id', 'cp_token'].forEach(k => {
          sessionStorage.removeItem(k);
          localStorage.removeItem(k);
        });
        window.location.href = '../pages/auth/login.html';
      });
    }
  }

  function refreshPendingBadge() {
    const n = Store.getPending().length;
    ['pending-count', 'drawer-pending-count'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = n;
      el.dataset.zero = String(n === 0);
    });
  }

  function initClock(timeId = 'clock-time', dateId = 'clock-date') {
    const t = document.getElementById(timeId), d = document.getElementById(dateId);
    if (!t) return;
    const tick = () => {
      const now = new Date();
      t.textContent = formatClock(now);
      if (d) d.textContent = formatDate(now);
    };
    tick();
    const timer = setInterval(tick, 1000);
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  }

  return { formatVND, formatTime, formatClock, formatDate, toDateKey, getParam, escapeHtml, minutesAgo, toast, showModal, closeModal, initDrawer, refreshPendingBadge, initClock };
})();
