// ChainPoint — Loyalty & Customer Data Management (Bách Hóa Xanh Model)
// Used by: Branch Management (Customers, Loyalty, Orders) & POS Checkout

const LoyaltyStore = (() => {
    const K_CUSTOMERS = 'cp_customers';
    const K_CONFIG = 'cp_loyalty_config';
    const K_TRANSACTIONS = 'cp_point_transactions';
    const K_MENU = 'cp_branch_menu';

    function read(k, fallback) {
        try {
            const v = JSON.parse(localStorage.getItem(k));
            return v ?? fallback;
        } catch {
            return fallback;
        }
    }
    function write(k, v) {
        localStorage.setItem(k, JSON.stringify(v));
    }

    // 1. Cấu hình chương trình Tích điểm & Đổi điểm (Lấy cảm hứng từ Bách Hóa Xanh)
    const DEFAULT_CONFIG = {
        earnRatioVND: 10000,        // 10.000 ₫ mua sắm = 1 điểm tích lũy
        pointValueVND: 1000,        // 1 điểm = 1.000 ₫ trừ trực tiếp vào hóa đơn
        minPointsToRedeem: 5,       // Tối thiểu 5 điểm (5.000 ₫) mới được đổi
        maxDiscountPercent: 50,     // Dùng điểm tối đa 50% giá trị hóa đơn
        pointExpiryDays: 365,       // Hạn sử dụng điểm: 365 ngày
        allowRedeem: true,          // Bật/Tắt tính năng đổi điểm
        allowEarn: true             // Bật/Tắt tích điểm mới
    };

    // 2. Dữ liệu khách hàng mẫu
    const DEFAULT_CUSTOMERS = [
        {
            id: 'KH10001',
            name: 'Nguyễn Thị Minh Hằng',
            phone: '0901234567',
            dob: '1992-05-14',
            branch: 'Chi nhánh Quận 1',
            totalSpent: 4850000,
            points: 125, // 125 điểm = 125.000 ₫
            joinedAt: '12/01/2026',
            tier: 'Vàng'
        },
        {
            id: 'KH10002',
            name: 'Lê Văn Hoàng',
            phone: '0912345678',
            dob: '1988-11-20',
            branch: 'Chi nhánh Quận 1',
            totalSpent: 2600000,
            points: 68, // 68 điểm = 68.000 ₫
            joinedAt: '18/02/2026',
            tier: 'Bạc'
        },
        {
            id: 'KH10003',
            name: 'Phạm Thu Trang',
            phone: '0988776655',
            dob: '1995-08-09',
            branch: 'Chi nhánh Quận 1',
            totalSpent: 7920000,
            points: 210, // 210 điểm = 210.000 ₫
            joinedAt: '05/01/2026',
            tier: 'Kim Cương'
        },
        {
            id: 'KH10004',
            name: 'Trần Đình Trọng',
            phone: '0933445566',
            dob: '1990-03-25',
            branch: 'Chi nhánh Thảo Điền',
            totalSpent: 1850000,
            points: 45,
            joinedAt: '14/03/2026',
            tier: 'Bạc'
        },
        {
            id: 'KH10005',
            name: 'Vũ Thị Lan Anh',
            phone: '0977112233',
            dob: '1997-12-02',
            branch: 'Chi nhánh Hoàn Kiếm',
            totalSpent: 3450000,
            points: 92,
            joinedAt: '22/02/2026',
            tier: 'Vàng'
        }
    ];

    // 3. Lịch sử giao dịch điểm mẫu
    const DEFAULT_TRANSACTIONS = [
        {
            txId: 'TXP-9008',
            customerId: 'KH10001',
            customerName: 'Nguyễn Thị Minh Hằng',
            phone: '0901234567',
            type: 'earn', // earn | redeem | refund | adjust
            typeLabel: 'Cộng điểm đơn hàng',
            points: 15,
            billId: 'HD80000008',
            branch: 'Chi nhánh Quận 1',
            staff: 'Thu ngân 01',
            createdAt: '02/11/2026 11:42',
            note: 'Tích điểm đơn hàng 150.000 ₫'
        },
        {
            txId: 'TXP-9007',
            customerId: 'KH10002',
            customerName: 'Lê Văn Hoàng',
            phone: '0912345678',
            type: 'redeem',
            typeLabel: 'Sử dụng điểm',
            points: -20,
            billId: 'HD80000007',
            branch: 'Chi nhánh Quận 1',
            staff: 'Thu ngân 01',
            createdAt: '02/11/2026 10:05',
            note: 'Dùng 20 điểm giảm 20.000 ₫'
        },
        {
            txId: 'TXP-9006',
            customerId: 'KH10003',
            customerName: 'Phạm Thu Trang',
            phone: '0988776655',
            type: 'earn',
            typeLabel: 'Cộng điểm đơn hàng',
            points: 38,
            billId: 'HD80000006',
            branch: 'Chi nhánh Quận 1',
            staff: 'Thu ngân 02',
            createdAt: '01/11/2026 20:15',
            note: 'Tích điểm đơn hàng 380.000 ₫'
        },
        {
            txId: 'TXP-9005',
            customerId: 'KH10001',
            customerName: 'Nguyễn Thị Minh Hằng',
            phone: '0901234567',
            type: 'adjust',
            typeLabel: 'Thưởng sinh nhật',
            points: 30,
            billId: '—',
            branch: 'Chi nhánh Quận 1',
            staff: 'Quản lý Nguyễn Văn Nam',
            createdAt: '28/10/2026 09:00',
            note: 'Quà tặng điểm tri ân sinh nhật'
        }
    ];

    // Seed ban đầu
    function initSeed() {
        if (!localStorage.getItem(K_CONFIG)) write(K_CONFIG, DEFAULT_CONFIG);
        if (!localStorage.getItem(K_CUSTOMERS)) write(K_CUSTOMERS, DEFAULT_CUSTOMERS);
        if (!localStorage.getItem(K_TRANSACTIONS)) write(K_TRANSACTIONS, DEFAULT_TRANSACTIONS);
    }
    initSeed();

    // API methods
    return {
        getConfig() {
            return read(K_CONFIG, DEFAULT_CONFIG);
        },
        saveConfig(cfg) {
            write(K_CONFIG, cfg);
        },

        getCustomers(branchFilter = null) {
            const list = read(K_CUSTOMERS, DEFAULT_CUSTOMERS);
            if (branchFilter && branchFilter !== 'all') {
                return list.filter(c => c.branch === branchFilter);
            }
            return list;
        },
        getCustomerByPhone(phone) {
            if (!phone) return null;
            const clean = phone.trim().replace(/\D/g, '');
            const list = read(K_CUSTOMERS, DEFAULT_CUSTOMERS);
            return list.find(c => c.phone.replace(/\D/g, '') === clean) || null;
        },
        getCustomerById(id) {
            const list = read(K_CUSTOMERS, DEFAULT_CUSTOMERS);
            return list.find(c => c.id === id) || null;
        },
        saveCustomer(custData) {
            const list = read(K_CUSTOMERS, DEFAULT_CUSTOMERS);
            let cust = list.find(c => c.id === custData.id || c.phone === custData.phone);
            if (cust) {
                Object.assign(cust, custData);
            } else {
                const newId = 'KH' + (10000 + list.length + 1);
                cust = {
                    id: newId,
                    name: custData.name,
                    phone: custData.phone,
                    dob: custData.dob || '',
                    branch: custData.branch || 'Chi nhánh Quận 1',
                    totalSpent: 0,
                    points: custData.points || 0,
                    joinedAt: new Date().toLocaleDateString('vi-VN'),
                    tier: 'Thành viên'
                };
                list.unshift(cust);
            }
            write(K_CUSTOMERS, list);
            return cust;
        },

        getTransactions(branchFilter = null) {
            const list = read(K_TRANSACTIONS, DEFAULT_TRANSACTIONS);
            if (branchFilter && branchFilter !== 'all') {
                return list.filter(t => t.branch === branchFilter);
            }
            return list;
        },

        // Tính toán quy đổi điểm theo đơn hàng
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
        },

        // Thực thi giao dịch điểm khi thanh toán thành công
        processCheckoutLoyalty({ customerId, pointsUsed, billAmount, billId, branch, staff }) {
            const cust = this.getCustomerById(customerId);
            if (!cust) return null;

            const cfg = this.getConfig();
            let discountVND = 0;
            const txList = read(K_TRANSACTIONS, DEFAULT_TRANSACTIONS);
            const nowStr = new Date().toLocaleString('vi-VN');

            // 1. Trừ điểm đã dùng
            if (pointsUsed > 0) {
                discountVND = pointsUsed * cfg.pointValueVND;
                cust.points = Math.max(0, cust.points - pointsUsed);

                txList.unshift({
                    txId: 'TXP-' + Date.now().toString().slice(-6),
                    customerId: cust.id,
                    customerName: cust.name,
                    phone: cust.phone,
                    type: 'redeem',
                    typeLabel: 'Sử dụng điểm',
                    points: -pointsUsed,
                    billId: billId || '—',
                    branch: branch || cust.branch,
                    staff: staff || 'Thu ngân',
                    createdAt: nowStr,
                    note: `Dùng ${pointsUsed} điểm giảm ${discountVND.toLocaleString('vi-VN')} ₫ cho hóa đơn ${billId}`
                });
            }

            // 2. Cộng điểm từ số tiền thanh toán thực tế
            const finalPaid = Math.max(0, billAmount - discountVND);
            const pointsEarned = this.calculatePointsEarned(finalPaid);

            if (pointsEarned > 0) {
                cust.points += pointsEarned;
                cust.totalSpent = (cust.totalSpent || 0) + finalPaid;

                txList.unshift({
                    txId: 'TXP-' + (Date.now() + 1).toString().slice(-6),
                    customerId: cust.id,
                    customerName: cust.name,
                    phone: cust.phone,
                    type: 'earn',
                    typeLabel: 'Cộng điểm đơn hàng',
                    points: pointsEarned,
                    billId: billId || '—',
                    branch: branch || cust.branch,
                    staff: staff || 'Thu ngân',
                    createdAt: nowStr,
                    note: `Tích điểm từ hóa đơn ${billId} (+${pointsEarned} điểm)`
                });
            }

            write(K_TRANSACTIONS, txList);

            // Cập nhật khách hàng
            const allCusts = read(K_CUSTOMERS, DEFAULT_CUSTOMERS);
            const idx = allCusts.findIndex(c => c.id === cust.id);
            if (idx >= 0) allCusts[idx] = cust;
            write(K_CUSTOMERS, allCusts);

            return {
                customer: cust,
                pointsUsed,
                discountVND,
                pointsEarned,
                finalBalance: cust.points
            };
        }
    };
})();

