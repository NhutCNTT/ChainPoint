/* Server-backed loyalty state. Balances are changed exclusively by payment/refund workflows. */
const LoyaltyStore = (() => {
    let config = null, customers = [], transactions = [];
    let configRequest, customerRequest, transactionRequest;
    const mapCustomer = c => ({ id: c.code, realId: c.id, name: c.name, phone: c.phone, dob: c.dateOfBirth || '',
        tier: c.tier, points: Number(c.points), totalSpent: Number(c.totalSpent), branchId: c.branchId,
        branchName: c.branchName, walletAddress: c.walletAddress || '', joinedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '' });
    const fromConfig = c => ({ earnRatioVND: c.earnRatioVnd, pointValueVND: c.pointValueVnd,
        minPointsToRedeem: c.minPointsToRedeem, maxDiscountPercent: c.maxDiscountPercent,
        pointExpiryDays: c.pointExpiryDays, allowEarn: c.allowEarn, allowRedeem: c.allowRedeem });
    async function refreshConfig() {
        if (!configRequest) configRequest = API.get('/loyalty/config').then(c => config = fromConfig(c)).finally(() => configRequest = null);
        return configRequest;
    }
    async function refreshCustomers() {
        if (!customerRequest) customerRequest = API.get('/customers').then(list => customers = list.map(mapCustomer)).finally(() => customerRequest = null);
        return customerRequest;
    }
    async function refreshTransactions() {
        if (!transactionRequest) transactionRequest = API.get('/loyalty/transactions').then(list => transactions = list.map(t => ({
            txId: t.txCode, customerId: t.customerCode || t.customerId, realCustomerId: t.customerId,
            customerName: t.customerName, phone: t.customerPhone, type: t.type,
            typeLabel: t.type === 'EARN' ? 'Tích điểm mua hàng' : t.type === 'REDEEM' ? 'Đổi điểm giảm giá' : 'Hoàn tiền đơn hàng',
            points: Number(t.pointsDelta), billId: t.billCode, staff: t.cashierUsername, note: t.note,
            createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString('vi-VN') : ''
        }))).finally(() => transactionRequest = null);
        return transactionRequest;
    }
    const ready = Promise.all([refreshConfig(), refreshCustomers(), refreshTransactions()]);
    ready.catch(error => CP.notify(error.message));
    return {
        ready, refreshConfig, refreshCustomers, refreshTransactions,
        getConfig: () => {
            if (!config) throw new Error('Chưa tải được cấu hình Loyalty từ máy chủ.');
            return { ...config };
        },
        getCustomers: () => customers,
        getTransactions: () => transactions,
        getCustomerById: id => customers.find(c => [c.id, c.realId, c.phone].map(String).includes(String(id))) || null,
        async getCustomerByPhone(phone) {
            if (!phone?.trim()) return null;
            try { return mapCustomer(await API.get('/customers/by-phone/' + encodeURIComponent(phone.trim()))); }
            catch (error) { if (error.status === 404) return null; throw error; }
        },
        async saveConfig(next) {
            const saved = await API.put('/loyalty/config', { earnRatioVnd: next.earnRatioVND, pointValueVnd: next.pointValueVND,
                minPointsToRedeem: next.minPointsToRedeem, maxDiscountPercent: next.maxDiscountPercent,
                pointExpiryDays: next.pointExpiryDays, allowEarn: next.allowEarn, allowRedeem: next.allowRedeem });
            config = fromConfig(saved); return { ...config };
        },
        async saveCustomer(data) {
            const existing = customers.find(c => String(c.realId) === String(data.realId || data.id) || String(c.id) === String(data.id));
            const id = data.realId || existing?.realId;
            const payload = { name: data.name, phone: data.phone, dateOfBirth: data.dob || null,
                branchId: existing?.branchId || Number(sessionStorage.getItem('cp_branch_id')) || null };
            const saved = id ? await API.put('/customers/' + id, payload) : await API.post('/customers', payload);
            await refreshCustomers(); return mapCustomer(saved);
        },
        calculateLoyaltyDiscount(points, amount) {
            if (!config) return { valid: false, discountVND: 0, error: 'Chưa tải cấu hình Loyalty.' };
            if (!points) return { valid: true, discountVND: 0, error: '' };
            if (!config.allowRedeem || points < config.minPointsToRedeem || points * config.pointValueVND > amount * config.maxDiscountPercent / 100) return { valid: false, discountVND: 0, error: 'Số điểm quy đổi không hợp lệ.' };
            return { valid: true, discountVND: points * config.pointValueVND, error: '' };
        },
        calculatePointsEarned: amount => config?.allowEarn ? Math.floor(amount / config.earnRatioVND) : 0
    };
})();
window.LoyaltyStore = LoyaltyStore;
