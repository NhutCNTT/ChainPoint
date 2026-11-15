// ChainPoint — Loyalty & Customer Data Management (Bách Hóa Xanh Model)
// Kết nối trực tiếp với MySQL Backend API thay thế hoàn toàn localStorage

const LoyaltyStore = (() => {
    // Cấu hình quy đổi điểm Bách Hóa Xanh chuẩn hóa
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

    // Nạp danh sách khách hàng từ MySQL Database
    async function fetchCustomersFromDB() {
        try {
            const res = await fetch('http://localhost:8080/api/v1/customers');
            if (res.ok) {
                cachedCustomers = await res.json();
            }
        } catch (e) {
            console.warn('Chưa kết nối được API Khách hàng MySQL:', e);
        }
        return cachedCustomers;
    }

    fetchCustomersFromDB();

    return {
        getConfig() {
            return DEFAULT_CONFIG;
        },

        async getCustomers() {
            return await fetchCustomersFromDB();
        },

        async getCustomerByPhone(phone) {
            if (!phone) return null;
            const cleanPhone = phone.trim();
            try {
                const res = await fetch(`http://localhost:8080/api/v1/customers/by-phone/${cleanPhone}`);
                if (res.ok) {
                    return await res.json();
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

                let res;
                if (custData.id && !isNaN(Number(custData.id))) {
                    res = await fetch(`http://localhost:8080/api/v1/customers/${custData.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    res = await fetch('http://localhost:8080/api/v1/customers', {
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

        // Tính toán quy đổi điểm theo đơn hàng (Mô hình Bách Hóa Xanh)
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

        // Tính điểm tích lũy được từ hóa đơn sau giảm giá
        calculatePointsEarned(paidAmount) {
            const cfg = this.getConfig();
            if (!cfg.allowEarn || paidAmount <= 0) return 0;
            return Math.floor(paidAmount / cfg.earnRatioVND);
        }
    };
})();
