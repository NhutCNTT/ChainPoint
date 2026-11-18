(() => {
  const tableId = UI.getParam('table');
  const table = getTable(tableId);
  if (!table) { location.replace('index.html'); return; }

  // Nạp giỏ: ưu tiên order đã lưu, nếu không thì lấy từ bill chờ thanh toán của bàn
  const saved = Store.getOrder(tableId) || Store.getPendingByTable(tableId);
  let cart = saved ? saved.items.map((i) => ({ ...i })) : [];
  const openedAt = saved ? saved.openedAt : null;
  let activeCat = 'all';
  let query = '';
  let dirty = false;
  const noteOpen = new Set();

  const $ = (id) => document.getElementById(id);
  const catList = $('cat-list'), menuGrid = $('menu-grid'), cartList = $('cart-list');

  const qtyOf = (id) => (cart.find((c) => c.id === id) || {}).qty || 0;
  const hueOf = (id) => (parseInt(id.slice(1), 10) * 37) % 360;

  /* ---------- Danh mục ---------- */
  function renderCats() {
    catList.innerHTML = CATEGORIES.map((c) => {
      const n = c.id === 'all' ? MENU.length : MENU.filter((m) => m.cat === c.id).length;
      return `<li><button id="cat-${c.id}" class="cat-item ${c.id === activeCat ? 'active' : ''}" data-cat="${c.id}" type="button"><span class="ico">${c.icon}</span>${c.name}<span class="cnt">${n}</span></button></li>`;
    }).join('');
  }

  /* ---------- Món ăn ---------- */
  function renderMenu() {
    const q = query.trim().toLowerCase();
    const items = MENU.filter((m) => (activeCat === 'all' || m.cat === activeCat) && (!q || m.name.toLowerCase().includes(q)));
    if (!items.length) {
      menuGrid.style.display = 'block';
      menuGrid.innerHTML = `<div class="empty-state"><div class="big">🍽️</div><p>Không tìm thấy món phù hợp</p></div>`;
      return;
    }
    menuGrid.style.display = '';
    menuGrid.innerHTML = items.map((m, i) => {
      const q = qtyOf(m.id);
      return `
      <button id="dish-${m.id}" class="dish" data-dish="${m.id}" type="button" style="--h:${hueOf(m.id)};animation-delay:${i * 20}ms">
        ${q ? `<span class="dish-qty">${q}</span>` : ''}
        <span class="dish-art">${m.emoji}</span>
        <span class="dish-body"><span class="dish-name">${m.name}</span><span class="dish-price">${UI.formatVND(m.price)}</span></span>
      </button>`;
    }).join('');
  }

  /* ---------- Giỏ hàng ---------- */
  function renderCart() {
    const total = Store.calcTotal(cart);
    const count = cart.reduce((s, i) => s + i.qty, 0);
    $('cart-total').textContent = UI.formatVND(total);
    $('cart-count').textContent = count ? `(${count} món)` : '';

    if (!cart.length) {
      cartList.innerHTML = `<li class="cart-empty"><div class="big">🛒</div><b>Chưa có món nào</b><span>Chạm vào món ở giữa để thêm</span></li>`;
      return;
    }
    cartList.innerHTML = cart.map((c) => `
      <li class="cart-item" data-id="${c.id}">
        <div class="ci-top">
          <div><div class="ci-name">${UI.escapeHtml(c.name)}</div><div class="ci-price">${UI.formatVND(c.price)}</div></div>
          <div class="ci-line money">${UI.formatVND(c.price * c.qty)}</div>
        </div>
        ${c.note && !noteOpen.has(c.id) ? `<div class="ci-note-text">📝 ${UI.escapeHtml(c.note)}</div>` : ''}
        <div class="ci-ctrl">
          <div class="qty">
            <button data-act="dec" aria-label="Giảm" type="button">−</button>
            <span class="n">${c.qty}</span>
            <button data-act="inc" aria-label="Tăng" type="button">+</button>
          </div>
          <button class="ci-btn ${c.note ? 'has-note' : ''}" data-act="note" type="button">📝 Ghi chú</button>
          <button class="ci-btn del" data-act="del" aria-label="Xóa món" type="button">🗑</button>
        </div>
        ${noteOpen.has(c.id) ? `<div class="ci-note"><input class="input" data-note="${c.id}" value="${UI.escapeHtml(c.note || '')}" placeholder="VD: ít cay, không hành…" maxlength="80"></div>` : ''}
      </li>`).join('');
    const inp = cartList.querySelector('[data-note]');
    if (inp) inp.focus();
  }

  function renderHeader() {
    $('page-title').textContent = 'Chọn món · ' + table.name;
    $('cart-table').textContent = table.name;
    $('cart-sub').textContent = (AREAS.find((a) => a.id === table.area) || {}).name + ' · ' + (openedAt ? 'Mở lúc ' + UI.formatTime(openedAt) : 'Bàn mới');
    const st = Store.getTableStatus(tableId).status;
    const badge = $('cart-status');
    badge.className = 'badge badge-' + st;
    badge.textContent = { free: 'Bàn mới', busy: 'Đang dùng', pending: 'Chờ thanh toán' }[st];
  }

  function change(id, delta) {
    let line = cart.find((c) => c.id === id);
    if (!line) {
      const m = getMenuItem(id);
      line = { id, name: m.name, price: m.price, qty: 0, note: '' };
      cart.push(line);
    }
    line.qty += delta;
    if (line.qty <= 0) { cart = cart.filter((c) => c.id !== id); noteOpen.delete(id); }
    dirty = true;
    renderCart(); renderMenu();
  }

  /* ---------- Events ---------- */
  catList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    activeCat = b.dataset.cat; renderCats(); renderMenu();
  });
  $('menu-search').addEventListener('input', (e) => { query = e.target.value; renderMenu(); });
  menuGrid.addEventListener('click', (e) => {
    const d = e.target.closest('[data-dish]'); if (!d) return;
    change(d.dataset.dish, 1);
    const again = document.getElementById('dish-' + d.dataset.dish);
    if (again) again.classList.add('bump');
  });
  cartList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const id = btn.closest('.cart-item').dataset.id;
    const act = btn.dataset.act;
    if (act === 'inc') change(id, 1);
    else if (act === 'dec') change(id, -1);
    else if (act === 'del') change(id, -qtyOf(id));
    else if (act === 'note') { noteOpen.has(id) ? noteOpen.delete(id) : noteOpen.add(id); renderCart(); }
  });
  cartList.addEventListener('input', (e) => {
    const id = e.target.dataset.note; if (!id) return;
    const line = cart.find((c) => c.id === id); line.note = e.target.value.trim(); dirty = true;
  });
  cartList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset.note) { noteOpen.delete(e.target.dataset.note); renderCart(); }
  });

  const goHome = () => { dirty = false; location.href = 'index.html'; };
  const persist = () => Store.saveOrder(tableId, cart.map((c) => ({ ...c, note: c.note || '' })));

  $('btn-exit').addEventListener('click', () => {
    if (!dirty) return goHome();
    UI.showModal({ icon: '⚠️', tone: 'warn', title: 'Thoát mà chưa lưu?', message: 'Các thay đổi trên bàn này sẽ bị mất.',
      actions: [{ label: 'Ở lại', id: 'modal-stay' }, { label: 'Thoát', cls: 'btn-danger', id: 'modal-leave', onClick: goHome }] });
  });

  $('btn-save').addEventListener('click', () => {
    persist(); dirty = false;
    UI.toast(cart.length ? `Đã lưu ${table.name}` : `Đã xóa order ${table.name}`);
    setTimeout(goHome, 600);
  });

  $('btn-temp').addEventListener('click', () => {
    if (!cart.length) return UI.toast('Chưa có món để tạm tính', 'error');
    const order = persist();
    Store.moveToPending(order.billId, 'temp'); dirty = false;
    UI.toast('Đã chuyển sang Chờ thanh toán');
    setTimeout(goHome, 600);
  });

  $('btn-pay').addEventListener('click', () => {
    if (!cart.length) return UI.toast('Chưa có món để thanh toán', 'error');
    const order = persist(); dirty = false;
    location.href = 'payment.html?bill=' + order.billId;
  });

  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  renderHeader(); renderCats(); renderMenu(); renderCart();
})();
