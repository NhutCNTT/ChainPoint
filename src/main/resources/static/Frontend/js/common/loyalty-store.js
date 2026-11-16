// ChainPoint — Loyalty & Customer Data Management (Bách Hóa Xanh Model)
// Kết nối trực tiếp với MySQL Backend API thay thế hoàn toàn mock data

const LoyaltyStore = (() => {
    const DEFAULT_CONFIG = {
        earnRatioVND: 10000,        // 10.000 ₫ mua sắm = 1 điểm tích lũy
        pointValueVND: 1000,        // 1 điểm = 1.000 ₫ trừ trực tiếp vào hóa đơn
        minPointsToRedeem: 5,       // Tối thiểu 5 điểm (5.000 ₫) mới được đổi
        maxDiscountPercent: 50,     // Dùng điểm tối đa 50% giá trị hóa đơn
        pointExpiryDays: 365,
        allowRedeem: true,
        allowEarn: true
    };

    let cachedCustomers = [];

    const getApiBase = () => {
        if (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '') {
            return 'http://localhost:8080/api/v1';
        }
        return '/api/v1';
    };

    // Nạp danh sách khách hàng từ MySQL Database
    async function fetchCustomersFromDB() {
        try {
            const res = await fetch(`${getApiBase()}/customers`);
            if (res.ok) {
                const list = await res.json();
                cachedCustomers = (Array.isArray(list) ? list : []).map(c => ({
                    id: c.code || ('KH' + c.id),
                    realId: c.id,
                    name: c.name,
                    phone: c.phone,
                    dob: c.dateOfBirth || '',
                    tier: c.tier || 'Bạc',
                    points: Number(c.points || 0),
                    totalSpent: Number(c.totalSpent || 0),
                    joinedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay'
                }));
            }
        } catch (e) {
            console.warn('Chưa kết nối được API Khách hàng MySQL:', e);
            cachedCustomers = [];
        }
        return cachedCustomers;
    }

    fetchCustomersFromDB();

    return {
        getConfig() {
            try {
                const saved = localStorage.getItem('cp_loyalty_config');
                if (saved) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(saved));
            } catch (e) {}
            return DEFAULT_CONFIG;
        },

        saveConfig(newConfig) {
            try {
                localStorage.setItem('cp_loyalty_config', JSON.stringify(newConfig));
            } catch (e) {}
            return Object.assign(DEFAULT_CONFIG, newConfig);
        },

        getCustomers() {
            return cachedCustomers;
        },

        async refreshCustomers() {
            return await fetchCustomersFromDB();
        },

        async getCustomerByPhone(phone) {
            if (!phone) return null;
            const cleanPhone = phone.trim();
            try {
                const res = await fetch(`${getApiBase()}/customers/by-phone/${cleanPhone}`);
                if (res.ok) {
                    const c = await res.json();
                    return {
                        id: c.code || ('KH' + c.id),
                        realId: c.id,
                        name: c.name,
                        phone: c.phone,
                        dob: c.dateOfBirth || '',
                        tier: c.tier || 'Bạc',
                        points: Number(c.points || 0),
                        totalSpent: Number(c.totalSpent || 0),
                        joinedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay'
                    };
                }
            } catch (e) {
                console.warn('Lỗi tìm khách hàng qua API:', e);
            }
            return cachedCustomers.find(c => c.phone === cleanPhone) || null;
        },

        async saveCustomer(custData) {
            try {
                const payload = {
                    name: custData.name,
                    phone: custData.phone,
                    dateOfBirth: custData.dob || null,
                    branchId: Number(sessionStorage.getItem('cp_branch_id')) || 1
                };

                const targetId = custData.realId || custData.id;
                let res;
                if (targetId && !isNaN(Number(targetId))) {
                    res = await fetch(`${getApiBase()}/customers/${targetId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    res = await fetch(`${getApiBase()}/customers`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }

                if (res.ok) {
                    const saved = await res.json();
                    await fetchCustomersFromDB();
                    return saved;
                }
            } catch (err) {
                console.error('Lỗi lưu khách hàng vào Database:', err);
            }
            return null;
        },

        calculateLoyaltyDiscount(pointsToUse, billAmount) {
            const cfg = this.getConfig();
            const points = parseInt(pointsToUse, 10) || 0;
            if (points <= 0) return { discountVND: 0, valid: true, error: '' };

            if (points < cfg.minPointsToRedeem) {
                return {
                    discountVND: 0,
                    valid: false,
                    error: `Mức đổi tối thiểu là ${cfg.minPointsToRedeem} điểm (${(cfg.minPointsToRedeem * cfg.pointValueVND).toLocaleString('vi-VN')} ₫)`
                };
            }

            const rawDiscount = points * cfg.pointValueVND;
            const maxAllowedDiscount = (billAmount * cfg.maxDiscountPercent) / 100;

            if (rawDiscount > maxAllowedDiscount) {
                const maxPoints = Math.floor(maxAllowedDiscount / cfg.pointValueVND);
                return {
                    discountVND: maxAllowedDiscount,
                    valid: false,
                    error: `Chỉ được dùng tối đa ${maxPoints} điểm (${cfg.maxDiscountPercent}% giá trị đơn hàng)`
                };
            }

            return {
                discountVND: rawDiscount,
                valid: true,
                error: ''
            };
        },

        calculatePointsEarned(paidAmount) {
            const cfg = this.getConfig();
            if (!cfg.allowEarn || paidAmount <= 0) return 0;
            return Math.floor(paidAmount / cfg.earnRatioVND);
        },

        getCustomerById(id) {
            return cachedCustomers.find(c => String(c.id) === String(id) || String(c.realId) === String(id)) || null;
        },

        getTransactions() {
            return [];
        }
    };
})();
