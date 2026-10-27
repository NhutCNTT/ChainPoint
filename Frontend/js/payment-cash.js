(() => {
  const { bill, billId } = PayCommon;
  if (!bill) return;

  const $ = (id) => document.getElementById(id);
  const input = $('received'), confirmBtn = $('btn-confirm-cash'), box = $('change-box');
  $('due-amount').textContent = UI.formatVND(bill.total);

  const parse = () => parseInt(input.value.replace(/\D/g, ''), 10) || 0;
  const setValue = (n) => { input.value = n ? n.toLocaleString('vi-VN') : ''; update(); };

  function update() {
    const received = parse();
    const diff = received - bill.total;
    box.classList.toggle('ok', received > 0 && diff >= 0);
    box.classList.toggle('short', received > 0 && diff < 0);
    if (!received) { $('change-label').textContent = 'Tiền thối khách'; $('change-amount').textContent = UI.formatVND(0); }
    else if (diff >= 0) { $('change-label').textContent = 'Tiền thối khách'; $('change-amount').textContent = UI.formatVND(diff); }
    else { $('change-label').textContent = 'Còn thiếu'; $('change-amount').textContent = UI.formatVND(-diff); }
    confirmBtn.disabled = !(received >= bill.total && bill.total > 0);
  }

  // Gợi ý mệnh giá: "Đủ tiền" + các mệnh giá làm tròn lên cao hơn tổng
  const denoms = [50000, 100000, 200000, 500000];
  const suggest = [...new Set([bill.total, ...denoms.map((d) => Math.ceil(bill.total / d) * d)])].slice(0, 5);
  $('quick').innerHTML = suggest.map((v, i) =>
    `<button id="quick-${i}" class="btn" type="button" data-v="${v}">${i === 0 ? 'Đủ tiền' : UI.formatVND(v)}</button>`).join('');
  $('quick').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) setValue(+b.dataset.v); });

  input.addEventListener('input', () => setValue(parse()));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !confirmBtn.disabled) confirmBtn.click(); });
  $('btn-cancel').addEventListener('click', () => history.back());

  confirmBtn.addEventListener('click', () => {
    const received = parse();
    if (received < bill.total) return;
    const change = received - bill.total;
    Store.payBill(billId, 'cash', { received, change });
    UI.showModal({
      icon: '✅', tone: 'success', title: 'Thanh toán thành công',
      message: `Đã thu <b>${UI.formatVND(bill.total)}</b>. Tiền thối khách: <b>${UI.formatVND(change)}</b>.`,
      actions: [
        { label: 'Xem lịch sử', id: 'modal-history', onClick: () => (location.href = 'history.html') },
        { label: 'Về chọn bàn', id: 'modal-home', cls: 'btn-primary', onClick: () => (location.href = 'index.html') }
      ]
    });
  });

  update();
  input.focus();
})();
