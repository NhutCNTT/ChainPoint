(() => {
  const { billId } = PayCommon;
  if (!billId) return;
  document.getElementById('method-cash').href = 'payment-cash.html?bill=' + billId;
  document.getElementById('method-transfer').href = 'payment-transfer.html?bill=' + billId;
})();
