/* Tiện ích dùng chung: định dạng, toast, modal, drawer, badge chờ thanh toán */
const UI = (() => {
  const formatVND = (n) => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
  const pad = (n) => String(n).padStart(2, '0');
  const formatTime = (iso) => { const d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const formatDate = (iso) => { const d = new Date(iso); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const toDateKey = (iso) => { const d = new Date(iso); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const getParam = (name) => new URLSearchParams(location.search).get(name);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const minutesAgo = (iso) => { const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)); return m < 60 ? m + ' phút' : Math.floor(m / 60) + 'g ' + (m % 60) + 'p'; };

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
    const overlay = document.createElement('div');
    overlay.className = 'overlay'; overlay.id = 'drawer-overlay';
    const drawer = document.createElement('aside');
    drawer.className = 'drawer'; drawer.id = 'drawer';
    drawer.setAttribute('aria-label', 'Menu chính');
    drawer.innerHTML = `
      <div class="drawer-head">
        <div class="brand-mark">CP</div>
        <div><div class="drawer-title">ChainPoint</div><div class="drawer-sub">POS thu ngân</div></div>
      </div>
      <a id="menu-tables" class="drawer-link ${activeKey === 'tables' ? 'active' : ''}" href="index.html"><span class="ico">🍽️</span>Chọn bàn</a>
      <a id="menu-history" class="drawer-link ${activeKey === 'history' ? 'active' : ''}" href="history.html"><span class="ico">📜</span>Lịch sử hóa đơn</a>
      <a id="menu-report" class="drawer-link disabled" href="#"><span class="ico">📊</span>Báo cáo ca (sắp có)</a>
      <a id="menu-settings" class="drawer-link disabled" href="#"><span class="ico">⚙️</span>Cài đặt (sắp có)</a>
      <div class="drawer-spacer"></div>
      <button id="menu-reset" class="drawer-link" type="button"><span class="ico">♻️</span>Đặt lại dữ liệu demo</button>
      <div class="drawer-user"><div class="avatar">TN</div><div><div style="font-weight:600">Thu ngân 01</div><div class="drawer-sub">Ca sáng</div></div></div>`;
    document.body.append(overlay, drawer);

    const open = () => { overlay.classList.add('open'); drawer.classList.add('open'); };
    const close = () => { overlay.classList.remove('open'); drawer.classList.remove('open'); };
    const btn = document.getElementById('btn-hamburger');
    if (btn) btn.addEventListener('click', open);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    drawer.querySelector('#menu-reset').addEventListener('click', () => {
      showModal({ icon: '♻️', tone: 'warn', title: 'Đặt lại dữ liệu demo?', message: 'Toàn bộ bàn, bill chờ và lịch sử sẽ trở về dữ liệu mẫu ban đầu.',
        actions: [{ label: 'Hủy' }, { label: 'Đặt lại', cls: 'btn-danger', onClick: () => Store.reset() }] });
    });
  }

  function refreshPendingBadge() {
    const el = document.getElementById('pending-count');
    if (!el) return;
    const n = Store.getPending().length;
    el.textContent = n; el.dataset.zero = n === 0;
  }

  function initClock(timeId = 'clock-time', dateId = 'clock-date') {
    const t = document.getElementById(timeId), d = document.getElementById(dateId);
    if (!t) return;
    const tick = () => { const now = new Date().toISOString(); t.textContent = formatTime(now); if (d) d.textContent = formatDate(now); };
    tick(); setInterval(tick, 15000);
  }

  return { formatVND, formatTime, formatDate, toDateKey, getParam, escapeHtml, minutesAgo, toast, showModal, closeModal, initDrawer, refreshPendingBadge, initClock };
})();
