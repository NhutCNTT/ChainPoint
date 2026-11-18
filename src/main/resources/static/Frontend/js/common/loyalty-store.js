// ChainPoint — Loyalty & Customer Data Management (Bách Hóa Xanh Model)
// Kết nối trực tiếp với MySQL Backend API thay thế hoàn toàn mock data

const LoyaltyStore = (() => {
    let currentConfig = {
        earnRatioVND: 10000,        // 10.000 ₫ mua sắm = 1 điểm tích lũy
        pointValueVND: 1000,        // 1 điểm = 1.000 ₫ trừ trực tiếp vào hóa đơn
        minPointsToRedeem: 5,       // Tối thiểu 5 điểm (5.000 ₫) mới được đổi
        maxDiscountPercent: 50,     // Dùng điểm tối đa 50% giá trị hóa đơn
        pointExpiryDays: 365,
        allowRedeem: true,
        allowEarn: true
    };

    let cachedCustomers = [];
    let cachedTransactions = [];

    let inflightConfigPromise = null;
    let inflightCustomersPromise = null;
    let inflightTransactionsPromise = null;

    const getApiBase = () => {
        if (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '') {
            return 'http://localhost:8080/api/v1';
        }
        if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
            return `${window.location.origin}/api/v1`;
        }
        return 'http://localhost:8080/api/v1';
    };

    const getToken = () => sessionStorage.getItem('cp_token') || localStorage.getItem('cp_token') || '';

    const authHeaders = (extra = {}) => {
        const token = getToken();
        return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...extra
        };
    };

    function mapCustomerDto(c) {
        return {
            id: c.code || ('KH' + c.id),
            realId: c.id,
            name: c.name,
            phone: c.phone,
            dob: c.dateOfBirth || '',
            tier: c.tier || 'Bạc',
            points: Number(c.points || 0),
            totalSpent: Number(c.totalSpent || 0),
            walletAddress: c.walletAddress || '',
            branchId: c.branchId || null,
            branchName: c.branchName || 'Toàn chuỗi',
            joinedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay'
        };
    }

    // 1. Nạp cấu hình tích điểm từ Backend DB (chống gọi trùng lặp song song)
    async function fetchConfigFromDB(force = false) {
        if (inflightConfigPromise && !force) return inflightConfigPromise;
        inflightConfigPromise = (async () => {
            try {
                const res = await window.API.fetch(`${getApiBase()}/loyalty/config`, { headers: authHeaders() });
                if (res.ok) {
                    const cfg = await res.json();
                    currentConfig = {
                        earnRatioVND: Math.max(1, Number(cfg.earnRatioVnd ?? cfg.earnRatioVND ?? 10000)),
                        pointValueVND: Math.max(1, Number(cfg.pointValueVnd ?? cfg.pointValueVND ?? 1000)),
                        minPointsToRedeem: Math.max(1, Number(cfg.minPointsToRedeem ?? 5)),
                        maxDiscountPercent: Math.min(100, Math.max(1, Number(cfg.maxDiscountPercent ?? 50))),
                        pointExpiryDays: Math.max(1, Number(cfg.pointExpiryDays ?? 365)),
                        allowRedeem: cfg.allowRedeem !== false,
                        allowEarn: cfg.allowEarn !== false
                    };
                }
            } catch (ignored) {
            } finally {
                inflightConfigPromise = null;
            }
            return currentConfig;
        })();
        return inflightConfigPromise;
    }

    // 2. Nạp danh sách khách hàng từ MySQL Database
    async function fetchCustomersFromDB(force = false) {
        if (inflightCustomersPromise && !force) return inflightCustomersPromise;
        inflightCustomersPromise = (async () => {
            try {
                const res = await window.API.fetch(`${getApiBase()}/customers`, { headers: authHeaders() });
                if (res.ok) {
                    const list = await res.json();
                    cachedCustomers = (Array.isArray(list) ? list : []).map(mapCustomerDto);
                }
            } catch (e) {
                console.warn('Chưa kết nối được API Khách hàng MySQL:', e);
                cachedCustomers = [];
            } finally {
                inflightCustomersPromise = null;
            }
            return cachedCustomers;
        })();
        return inflightCustomersPromise;
    }

    // 3. Nạp lịch sử biến động điểm từ MySQL Database (/loyalty/transactions hoặc tổng hợp từ /orders)
    async function fetchTransactionsFromDB(force = false) {
        if (inflightTransactionsPromise && !force) return inflightTransactionsPromise;
        inflightTransactionsPromise = (async () => {
            try {
                const txRes = await window.API.fetch(`${getApiBase()}/loyalty/transactions`, { headers: authHeaders() });
                if (txRes.ok) {
                    const txList = await txRes.json();
                    if (Array.isArray(txList) && txList.length > 0) {
                        cachedTransactions = txList.map(t => {
                            const pts = Number(t.pointsDelta ?? t.points ?? 0);
                            const typeUpper = String(t.type || '').toUpperCase();
                            const typeLabel = typeUpper === 'REDEEM'
                                ? 'Đổi điểm giảm giá'
                                : (typeUpper === 'REFUND' ? 'Hoàn tiền đơn hàng' : 'Tích điểm mua hàng');
                            return {
                                txId: t.txCode || ('TX-' + t.id),
                                customerId: t.customerCode || t.customerId,
                                realCustomerId: t.customerId,
                                customerName: t.customerName || 'Hội viên',
                                phone: t.customerPhone || '—',
                                type: typeUpper || (pts >= 0 ? 'EARN' : 'REDEEM'),
                                typeLabel,
                                points: pts,
                                billId: t.billCode || '—',
                                staff: t.cashierUsername || 'Hệ thống',
                                note: t.note || '',
                                createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString('vi-VN') : '—'
                            };
                        });
                        return cachedTransactions;
                    }
                }
            } catch (ignored) {}

            // Tổng hợp trực tiếp từ bảng bills trong MySQL thông qua /api/v1/orders
            try {
                const branchId = sessionStorage.getItem('cp_branch_id') || '';
                const url = branchId ? `${getApiBase()}/orders?branchId=${branchId}` : `${getApiBase()}/orders`;
                const res = await window.API.fetch(url, { headers: authHeaders() });
                if (res.ok) {
                    const bills = await res.json();
                    const derived = [];

                    (Array.isArray(bills) ? bills : []).forEach(b => {
                        const used = Number(b.pointsUsed || 0);
                        const earned = Number(b.pointsEarned || 0);
                        const phone = b.customerPhone || '';
                        const custName = b.customerName || (phone ? phone : 'Khách vãng lai');
                        const timeStr = b.createdAt ? new Date(b.createdAt).toLocaleString('vi-VN') : '—';
                        const staff = b.cashierUsername || 'Thu ngân';

                        if (used > 0) {
                            derived.push({
                                txId: `RD-${b.billCode}`,
                                customerId: phone,
                                customerName: custName,
                                phone: phone || '—',
                                type: 'REDEEM',
                                typeLabel: 'Đổi điểm giảm giá',
                                points: -used,
                                billId: b.billCode,
                                staff,
                                note: `Áp dụng giảm trừ ${(Number(b.discountAmount || used * currentConfig.pointValueVND)).toLocaleString('vi-VN')} ₫`,
                                createdAt: timeStr
                            });
                        }

                        if (earned > 0) {
                            derived.push({
                                txId: `ER-${b.billCode}`,
                                customerId: phone,
                                customerName: custName,
                                phone: phone || '—',
                                type: 'EARN',
                                typeLabel: 'Tích điểm mua hàng',
                                points: earned,
                                billId: b.billCode,
                                staff,
                                note: `Tích điểm từ đơn ${(Number(b.finalAmount || 0)).toLocaleString('vi-VN')} ₫`,
                                createdAt: timeStr
                            });
                        }

                        if (b.status === 'refunded' && (used > 0 || earned > 0)) {
                            const delta = used - earned;
                            if (delta !== 0) {
                                derived.push({
                                    txId: `RF-${b.billCode}`,
                                    customerId: phone,
                                    customerName: custName,
                                    phone: phone || '—',
                                    type: 'REFUND',
                                    typeLabel: 'Hoàn tiền đơn hàng',
                                    points: delta,
                                    billId: b.billCode,
                                    staff,
                                    note: `Cân đối điểm khi hoàn đơn #${b.billCode}`,
                                    createdAt: timeStr
                                });
                            }
                        }
                    });

                    cachedTransactions = derived;
                }
            } catch (e) {
                console.warn('Không thể tải lịch sử giao dịch điểm từ Database:', e);
                cachedTransactions = [];
            } finally {
                inflightTransactionsPromise = null;
            }

            return cachedTransactions;
        })();
        return inflightTransactionsPromise;
    }

    fetchConfigFromDB();
    fetchCustomersFromDB();
    fetchTransactionsFromDB();

    return {
        getConfig() {
            return { ...currentConfig };
        },

        async refreshConfig() {
            return await fetchConfigFromDB();
        },

        async saveConfig(newConfig) {
            const cfg = { ...currentConfig, ...newConfig };
            await window.API.put('/loyalty/config', {
                earnRatioVnd: cfg.earnRatioVND, pointValueVnd: cfg.pointValueVND,
                minPointsToRedeem: cfg.minPointsToRedeem, maxDiscountPercent: cfg.maxDiscountPercent,
                pointExpiryDays: cfg.pointExpiryDays, allowEarn: cfg.allowEarn, allowRedeem: cfg.allowRedeem
            });
            return await fetchConfigFromDB(true);
        },

        getCustomers() {
            return cachedCustomers;
        },

        async refreshCustomers(force = false) {
            return await fetchCustomersFromDB(force);
        },

        async getCustomerByPhone(phone) {
            if (!phone) return null;
            const cleanPhone = phone.trim();
            try {
                const res = await window.API.fetch(`${getApiBase()}/customers/by-phone/${encodeURIComponent(cleanPhone)}`, { headers: authHeaders() });
                if (res.ok) {
                    const c = await res.json();
                    return mapCustomerDto(c);
                }
            } catch (e) {
                console.warn('Lỗi tìm khách hàng qua API:', e);
            }
            return cachedCustomers.find(c => c.phone === cleanPhone) || null;
        },

        async saveCustomer(custData) {
            try {
                let branchId = Number(sessionStorage.getItem('cp_branch_id')) || null;
                if (!branchId) throw new Error('Vui lòng chọn chi nhánh trước khi thêm hội viên.');

                const payload = {
                    name: custData.name,
                    phone: custData.phone,
                    dateOfBirth: custData.dob || null,
                    branchId: branchId,
                    tier: custData.tier || 'Bạc',
                    points: custData.points != null ? Number(custData.points) : 0
                };

                const existing = cachedCustomers.find(c =>
                    String(c.id) === String(custData.id) ||
                    String(c.realId) === String(custData.realId || custData.id)
                );
                const targetId = custData.realId || (existing ? existing.realId : null) || (!isNaN(Number(custData.id)) ? Number(custData.id) : null);

                let res;
                if (targetId) {
                    res = await window.API.fetch(`${getApiBase()}/customers/${targetId}`, {
                        method: 'PUT',
                        headers: authHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(payload)
                    });
                } else {
                    res = await window.API.fetch(`${getApiBase()}/customers`, {
                        method: 'POST',
                        headers: authHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify(payload)
                    });
                }

                if (res.ok) {
                    const saved = await res.json();
                    await fetchCustomersFromDB(true);
                    return mapCustomerDto(saved);
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

            if (!cfg.allowRedeem) {
                return {
                    discountVND: 0,
                    valid: false,
                    error: 'Chương trình đổi điểm giảm giá hiện đang tạm khóa.'
                };
            }

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
            return Math.floor(paidAmount / Math.max(1, cfg.earnRatioVND));
        },

        processCheckoutLoyalty({ customerId, customer, pointsUsed = 0, billAmount = 0 }) {
            const cust = customer || this.getCustomerById(customerId);
            if (!cust) return null;
            const used = parseInt(pointsUsed, 10) || 0;
            const discRes = this.calculateLoyaltyDiscount(used, billAmount);
            const discountVND = discRes.valid ? discRes.discountVND : 0;
            const netPaid = Math.max(0, billAmount - discountVND);
            const pointsEarned = this.calculatePointsEarned(netPaid);
            const currentPts = Number(cust.points || 0);
            const finalBalance = Math.max(0, currentPts - used + pointsEarned);

            return {
                customer: cust,
                pointsUsed: used,
                discountVND,
                pointsEarned,
                finalBalance
            };
        },

        getCustomerById(id) {
            return cachedCustomers.find(c =>
                String(c.id) === String(id) ||
                String(c.realId) === String(id) ||
                String(c.phone) === String(id)
            ) || null;
        },

        getTransactions() {
            return cachedTransactions;
        },

        async refreshTransactions(force = false) {
            return await fetchTransactionsFromDB(force);
        }
    };
})();

window.LoyaltyStore = LoyaltyStore;
