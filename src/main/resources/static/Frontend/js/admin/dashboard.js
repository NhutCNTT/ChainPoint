// ChainPoint — Dashboard interactivity (Sales line chart, filters, tooltips, multi-branch data)
// Dữ liệu kết nối trực tiếp 100% với MySQL Backend API (không dùng mock data)

(async function () {
    await window.CP.ready;
    const getStorage = k => sessionStorage.getItem(k) || localStorage.getItem(k);
    const urlParams = new URLSearchParams(window.location.search);
    const branchFromUrl = urlParams.get('branch');
    const branchIdFromUrl = urlParams.get('branchId');

    if (branchFromUrl) {
        sessionStorage.setItem('cp_branch', branchFromUrl);
    }
    if (branchIdFromUrl) {
        sessionStorage.setItem('cp_branch_id', branchIdFromUrl);
    }

    const currentUserRole = getStorage('cp_role') || 'owner';
    const currentUserBranch = getStorage('cp_branch') || '';
    const currentBranchId = getStorage('cp_branch_id') || null;

    let branchesList = [];
    let selectedBranchId = (currentUserRole === 'manager' && currentBranchId)
        ? currentBranchId
        : (currentUserRole !== 'manager' && branchIdFromUrl ? branchIdFromUrl : 'all');
    let currentMetric = 'revenue';
    let currentRange = '7days';
    let customFrom = '', customTo = '';
    let currentMetricsData = {
        totalRevenue: 0,
        revenueGrowth: '+0.0%',
        totalOrders: 0,
        ordersGrowth: '+0.0%',
        totalCustomers: 0,
        customerGrowth: '+0.0%'
    };
    let currentChartPoints = [];
    let thisWeekTotalVal = 0;
    let lastWeekTotalVal = 0;

    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    // DOM Elements
    const branchSelector = document.getElementById('dashboardBranchSelector');
    const dashboardTitle = document.getElementById('dashboardTitle');
    const dashboardSub = document.getElementById('dashboardSubtitle');
    const metricRevenue = document.getElementById('metricRevenueValue');
    const metricOrders = document.getElementById('metricOrdersValue');
    const metricCustomers = document.getElementById('metricCustomersValue');
    const metricRevenueGrowth = document.getElementById('metricRevenueGrowth');
    const metricOrdersGrowth = document.getElementById('metricOrdersGrowth');
    const metricCustomersGrowth = document.getElementById('metricCustomersGrowth');
    const chartLegendCurrent = document.getElementById('chartLegendCurrent');
    const chartLegendLast = document.getElementById('chartLegendLast');

    const tooltip = document.getElementById('chartTooltip');
    const tooltipDate = document.getElementById('tooltipDate');
    const tooltipValue = document.getElementById('tooltipValue');
    const tooltipSub = document.getElementById('tooltipSub');
    const hoverGuide = document.getElementById('hoverGuide');
    const chartSvg = document.querySelector('.chart-svg');

    const api = () => window.API;

    function applyGrowthBadge(el, growthStr) {
        if (!el) return;
        const val = growthStr || '+0.0%';
        const isNegative = String(val).trim().startsWith('-');
        el.className = `trend-badge ${isNegative ? 'trend-down' : 'trend-up'}`;
        el.textContent = `${isNegative ? '▼' : '▲'} ${val}`;
    }

    // 1. Nạp danh sách chi nhánh thực tế từ MySQL
    async function fetchBranches() {
        try {
            const data = await api().get('/branches');
            branchesList = Array.isArray(data) ? data : [];
        } catch (e) {
            console.warn('Không thể nạp danh sách chi nhánh từ MySQL API:', e);
            branchesList = [];
        }
        initBranchSelector();
    }

    function initBranchSelector() {
        if (!branchSelector) return;

        if (currentUserRole === 'manager') {
            const currentB = branchesList.find(b => String(b.id) === String(currentBranchId) || b.name === currentUserBranch) || { name: currentUserBranch || 'Chi nhánh' };
            if (currentB.id && !currentBranchId) {
                selectedBranchId = currentB.id;
                sessionStorage.setItem('cp_branch_id', currentB.id);
            }
            branchSelector.innerHTML = `<option value="${selectedBranchId || ''}">📍 ${currentB.name}</option>`;
            branchSelector.disabled = true;
        } else {
            if (branchFromUrl && (!selectedBranchId || selectedBranchId === 'all')) {
                const matchedBranch = branchesList.find(b => b.name === branchFromUrl || String(b.id) === String(branchFromUrl));
                if (matchedBranch) selectedBranchId = String(matchedBranch.id);
            }

            let options = `<option value="all">🌐 Toàn chuỗi nhà hàng (Tổng hợp ${branchesList.length} CN)</option>`;
            branchesList.forEach(b => {
                options += `<option value="${b.id}">📍 ${window.escapeHtml(b.name)} (${window.escapeHtml(b.code) || ''})</option>`;
            });
            branchSelector.innerHTML = options;
            branchSelector.value = selectedBranchId;
            branchSelector.addEventListener('change', (e) => {
                selectedBranchId = e.target.value;
                loadDashboardData();
            });
        }
    }

    // 2. Nạp dữ liệu Metrics & Chart từ MySQL API
    async function loadDashboardData() {
        try { branchesList = await api().get('/branches'); } catch (error) { CP.notify(error.message); }
        const hasBranch = selectedBranchId && selectedBranchId !== 'all';
        let metricsQuery = hasBranch
            ? `?branchId=${selectedBranchId}&range=${encodeURIComponent(currentRange)}`
            : `?range=${encodeURIComponent(currentRange)}`;
        if (customFrom && customTo) metricsQuery += '&' + new URLSearchParams({ from: customFrom, to: customTo });
        const branchQuery = hasBranch ? `?branchId=${selectedBranchId}` : '';

        // Tải metrics từ MySQL
        try {
            const data = await api().get(`/admin/dashboard/metrics${metricsQuery}`);
            for (const [label, value, id] of [['Nhân viên', data.totalEmployees, 'metricEmployees'], ['Chi nhánh', data.totalBranches, 'metricBranches']]) {
                let node = document.getElementById(id);
                if (!node) {
                    const card = document.createElement('article'); card.className = 'metric-card';
                    const title = document.createElement('h3'); title.textContent = label;
                    node = document.createElement('div'); node.id = id; node.className = 'metric-value'; card.append(title, node);
                    document.querySelector('.metrics-grid').appendChild(card);
                }
                node.textContent = value ?? '—';
            }
            currentMetricsData = {
                totalRevenue: data.totalRevenue || 0,
                revenueGrowth: data.revenueGrowth || '+0.0%',
                totalOrders: data.totalOrders || 0,
                ordersGrowth: data.ordersGrowth || '+0.0%',
                totalCustomers: data.totalCustomers || 0,
                customerGrowth: data.customerGrowth || '+0.0%'
            };
        } catch (err) {
            currentMetricsData = { totalRevenue: 0, revenueGrowth: '+0.0%', totalOrders: 0, ordersGrowth: '+0.0%', totalCustomers: 0, customerGrowth: '+0.0%' };
        }

        // Tải biểu đồ doanh thu từ MySQL (RevenueChartResponse trả về thisWeek, lastWeek, thisWeekTotal, lastWeekTotal)
        try {
            const chartData = await api().get(`/admin/dashboard/revenue-chart${branchQuery}`);
            const points = (chartData && Array.isArray(chartData.thisWeek))
                ? chartData.thisWeek
                : (chartData && Array.isArray(chartData.points) ? chartData.points : []);
            currentChartPoints = points;
            thisWeekTotalVal = Number(chartData?.thisWeekTotal ?? currentMetricsData.totalRevenue ?? 0);
            lastWeekTotalVal = Number(chartData?.lastWeekTotal ?? 0);
        } catch (err) {
            currentChartPoints = [];
            thisWeekTotalVal = 0;
            lastWeekTotalVal = 0;
        }

        updateDashboardUI();
        loadTopDishes(branchQuery);
        renderBranchPerformance();
    }

    async function loadTopDishes(queryBranch) {
        const tbody = document.getElementById('topDishesBody');
        if (!tbody) return;
        try {
            const list = await api().get(`/admin/dashboard/top-dishes${queryBranch}`);
            if (Array.isArray(list) && list.length > 0) {
                    tbody.innerHTML = list.map((item, idx) => {
                        const qty = item.quantitySold ?? item.quantity ?? item.soldCount ?? 0;
                        const rev = item.totalRevenue ?? item.revenue ?? 0;
                        return `
                            <tr>
                                <td>
                                    <div class="dish-item">
                                        <div class="dish-icon">${window.escapeHtml(item.emoji || '🍽️')}</div>
                                        <div class="dish-info">
                                            <strong>${window.escapeHtml(item.name || ('Món #' + (idx + 1)))}</strong>
                                            <small>${window.escapeHtml(item.category || ('Top #' + (idx + 1)))}</small>
                                        </div>
                                    </div>
                                </td>
                                <td><strong>${Number(qty).toLocaleString('vi-VN')}</strong> suất</td>
                                <td style="font-weight: 700; color: var(--text);">${formatVND(rev)}</td>
                            </tr>
                        `;
                    }).join('');
                    return;
                }
        } catch (e) {}

        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 36px; color: var(--muted);">Chưa có dữ liệu món bán chạy trong Database.</td></tr>`;
    }

    function renderBranchPerformance() {
        const container = document.getElementById('branchPerformanceList');
        if (!container) return;

        if (!branchesList || branchesList.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 36px; color: var(--muted);">Chưa có chi nhánh nào trong Database.</div>`;
            return;
        }

        const totalChainRev = branchesList.reduce((acc, b) => acc + Number(b.weeklyRevenue || 0), 0);

        container.innerHTML = branchesList.map(b => {
            const rev = Number(b.weeklyRevenue || 0);
            const pct = totalChainRev > 0 ? Math.round((rev / totalChainRev) * 100) : 0;
            return `
                <div class="branch-item" style="margin-bottom: 16px;">
                    <div class="branch-meta" style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                        <span class="branch-name" style="font-weight: 700;">📍 ${window.escapeHtml(b.name)} (${window.escapeHtml(b.code) || ''})</span>
                        <span class="branch-sales" style="font-weight: 800; color: var(--primary);">${formatVND(rev)}</span>
                    </div>
                    <div class="branch-bar-bg" style="height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                        <div class="branch-bar-fill" style="width: ${pct}%; height: 100%; background: var(--primary); border-radius: 999px;"></div>
                    </div>
                    <div class="branch-sub" style="display:flex; justify-content:space-between; font-size: 12px; color: var(--muted); margin-top: 4px;">
                        <span>Quản lý: ${window.escapeHtml(b.managerName || 'Chưa chỉ định')}</span>
                        <span>${pct}% tổng doanh thu</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateDashboardUI() {
        const selectedBranch = branchesList.find(b => String(b.id) === String(selectedBranchId));
        const branchName = selectedBranch ? selectedBranch.name : (selectedBranchId === 'all' ? 'Toàn chuỗi nhà hàng' : currentUserBranch);

        if (dashboardTitle) {
            dashboardTitle.textContent = currentUserRole === 'manager'
                ? `Tổng quan — ${branchName}`
                : (selectedBranchId === 'all' ? 'Tổng quan chuỗi nhà hàng' : `Tổng quan — ${branchName}`);
        }
        if (dashboardSub) {
            dashboardSub.textContent = selectedBranchId === 'all'
                ? `Dữ liệu kinh doanh và doanh thu thực tế từ MySQL (${branchesList.length} chi nhánh).`
                : `Số liệu doanh thu, đơn hàng và khách hàng tại ${branchName}.`;
        }

        if (metricRevenue) metricRevenue.textContent = formatVND(currentMetricsData.totalRevenue);
        if (metricOrders) metricOrders.innerHTML = `${Number(currentMetricsData.totalOrders || 0).toLocaleString('vi-VN')} <span style="font-size: 20px; font-weight: 600; color: var(--muted);">đơn</span>`;
        if (metricCustomers) metricCustomers.innerHTML = `${Number(currentMetricsData.totalCustomers || 0).toLocaleString('vi-VN')} <span style="font-size: 20px; font-weight: 600; color: var(--muted);">khách</span>`;

        applyGrowthBadge(metricRevenueGrowth, currentMetricsData.revenueGrowth);
        applyGrowthBadge(metricOrdersGrowth, currentMetricsData.ordersGrowth);
        applyGrowthBadge(metricCustomersGrowth, currentMetricsData.customerGrowth);

        if (chartLegendCurrent) {
            chartLegendCurrent.textContent = `Tuần này (${formatVND(thisWeekTotalVal)})`;
        }
        if (chartLegendLast) {
            chartLegendLast.textContent = `Tuần trước (${formatVND(lastWeekTotalVal)})`;
        }

        renderChartSVG();
    }

    // 3. Vẽ biểu đồ động từ dữ liệu MySQL
    function renderChartSVG() {
        const defaultDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        const points = (currentChartPoints && currentChartPoints.length > 0)
            ? currentChartPoints
            : defaultDays.map(d => ({ day: d, val: 0, label: '0 ₫', orders: 0, growth: '+0.0%' }));

        const getPointValue = p => currentMetric === 'orders' ? (Number(p.orders) || 0) : (Number(p.val) || 0);
        const maxVal = Math.max(...points.map(getPointValue), currentMetric === 'orders' ? 10 : 1000000);
        const svgW = 760;
        const svgH = 240;
        const padX = 50;
        const padYTop = 30;
        const padYBottom = 45;
        const plotW = svgW - padX * 2;
        const plotH = svgH - padYTop - padYBottom;

        const coords = points.map((p, idx) => {
            const x = padX + (idx / Math.max(points.length - 1, 1)) * plotW;
            const ratio = getPointValue(p) / maxVal;
            const y = (svgH - padYBottom) - ratio * plotH;
            return { x, y, ...p };
        });

        const linePath = coords.map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ');
        const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${svgH - padYBottom} L ${coords[0].x} ${svgH - padYBottom} Z`;

        const chartLine = document.querySelector('.chart-line-current');
        const chartArea = document.querySelector('.chart-area-current');
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2f6bff';
        document.querySelectorAll('#blueGradient stop').forEach(stop => {
            stop.setAttribute('stop-color', primaryColor);
        });
        if (chartLine) {
            chartLine.setAttribute('d', linePath);
            chartLine.setAttribute('stroke', primaryColor);
        }
        if (chartArea) chartArea.setAttribute('d', areaPath);

        // Update dynamic Y-axis labels
        const yTop = document.getElementById('yAxisTop');
        const yMidHigh = document.getElementById('yAxisMidHigh');
        const yMidLow = document.getElementById('yAxisMidLow');
        const formatAxis = v => currentMetric === 'orders' ? `${Math.round(v)} đơn` : formatVND(Math.round(v));
        if (yTop) yTop.textContent = formatAxis(maxVal);
        if (yMidHigh) yMidHigh.textContent = formatAxis((maxVal * 2) / 3);
        if (yMidLow) yMidLow.textContent = formatAxis(maxVal / 3);

        // Render data points
        const pointsContainer = document.querySelector('.chart-points-container') || chartSvg;
        const existingDots = document.querySelectorAll('.data-point');
        existingDots.forEach(d => d.remove());

        coords.forEach((c, idx) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'data-point');
            circle.setAttribute('cx', c.x);
            circle.setAttribute('cy', c.y);
            circle.setAttribute('r', '6');
            circle.setAttribute('fill', '#ffffff');
            circle.setAttribute('stroke', primaryColor);
            circle.setAttribute('stroke-width', '3');
            circle.setAttribute('data-index', idx);

            circle.addEventListener('mouseenter', () => {
                tooltipDate.textContent = `${c.day}${c.date ? ' (' + c.date + ')' : ' (Tuần này)'}`;
                tooltipValue.textContent = currentMetric === 'revenue'
                    ? `${formatVND(c.val)} (${c.orders || 0} đơn)`
                    : `${c.orders || 0} đơn (${formatVND(c.val)})`;
                tooltipSub.textContent = `Tăng trưởng: ${c.growth || '+0.0%'}`;

                const viewport = document.querySelector('.chart-viewport').getBoundingClientRect();
                const leftPx = (c.x / svgW) * viewport.width;
                const topPx = (c.y / svgH) * viewport.height;

                tooltip.style.left = `${leftPx}px`;
                tooltip.style.top = `${topPx}px`;
                tooltip.classList.add('is-active');

                if (hoverGuide) {
                    hoverGuide.setAttribute('x1', c.x);
                    hoverGuide.setAttribute('x2', c.x);
                    hoverGuide.style.opacity = '1';
                }
            });

            circle.addEventListener('mouseleave', () => {
                tooltip.classList.remove('is-active');
                if (hoverGuide) hoverGuide.style.opacity = '0';
            });

            pointsContainer.appendChild(circle);
        });
    }

    // Toggle between "Doanh thu" and "Số lượng đơn"
    const metricPills = document.querySelectorAll('.chart-pill');
    metricPills.forEach(pill => {
        pill.addEventListener('click', () => {
            metricPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentMetric = pill.dataset.metric;
            renderChartSVG();
        });
    });

    // Time range filter tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentRange = tab.dataset.range || '7days';
            customFrom = ''; customTo = '';
            loadDashboardData();
        });
    });

    // Keyboard shortcut (Ctrl+K)
    const searchInput = document.getElementById('searchInput');
    const results = document.createElement('div'); results.id = 'dashboardSearchResults'; results.setAttribute('aria-live', 'polite');
    results.style.cssText = 'position:absolute;background:var(--card,#fff);box-shadow:0 8px 24px #0002;border-radius:10px;z-index:20;width:100%;max-height:340px;overflow:auto';
    if (searchInput) {
        searchInput.parentElement.style.position = 'relative'; searchInput.parentElement.appendChild(results);
        let timeout, generation = 0;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout); const current = ++generation;
            const query = searchInput.value.trim().toLowerCase(); results.replaceChildren();
            if (!query) return;
            timeout = setTimeout(async () => {
                results.textContent = 'Đang tìm kiếm...';
                const branchQuery = selectedBranchId && selectedBranchId !== 'all' ? '?branchId=' + selectedBranchId : '';
                try {
                    const [orders, products, customers] = await Promise.all(['orders', 'products', 'customers'].map(resource => api().get('/' + resource + branchQuery)));
                    if (current !== generation) return;
                    results.replaceChildren();
                    const matches = [
                        ...orders.filter(o => [o.billCode, o.customerName, o.customerPhone].some(v => String(v || '').toLowerCase().includes(query))).map(o => [o.billCode, 'branch/orders', o.branchId, o.billCode]),
                        ...products.filter(p => p.name.toLowerCase().includes(query)).map(p => [p.name, 'branch/menu', p.branchId || selectedBranchId, p.name]),
                        ...customers.filter(c => [c.name, c.phone].some(v => v.toLowerCase().includes(query))).map(c => [c.name + ' · ' + c.phone, 'branch/customers', c.branchId, c.phone])
                    ].slice(0, 15);
                    matches.forEach(([label, route, branchId, q]) => {
                        const link = document.createElement('a'); link.textContent = label;
                        const params = new URLSearchParams({ q }); if (branchId && branchId !== 'all') params.set('branchId', branchId);
                        link.href = '/Frontend/pages/' + route + '.html?' + params; link.style.cssText = 'display:block;padding:12px'; results.appendChild(link);
                    });
                    if (!matches.length) results.textContent = 'Không tìm thấy kết quả.';
                } catch (error) { results.textContent = error.message; }
            }, 250);
        });
    }
    const notificationButton = document.querySelector('button[aria-label="Thông báo"]');
    notificationButton?.querySelector('.notif-badge')?.remove();
    notificationButton?.addEventListener('click', async () => {
        try {
            const query = selectedBranchId && selectedBranchId !== 'all' ? '?branchId=' + selectedBranchId : '';
            const orders = await api().get('/orders' + query);
            const active = orders.filter(order => ['open', 'pending'].includes(order.status)).length;
            window.showToast?.(`${active} đơn hàng đang xử lý trong phạm vi được chọn.`);
        } catch (error) { CP.notify(error.message); }
    });
    const profile = document.querySelector('.profile-chip');
    if (profile) {
        profile.tabIndex = 0; profile.setAttribute('role', 'link');
        profile.onclick = () => location.href = '/Frontend/pages/employee/profile.html';
        profile.onkeydown = event => { if (event.key === 'Enter') profile.click(); };
    }
    const customRange = document.createElement('form'); customRange.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center';
    customRange.innerHTML = '<label>Từ <input type="date" id="dashboardFrom" required></label><label>Đến <input type="date" id="dashboardTo" required></label><button class="btn-secondary" type="submit">Lọc ngày</button>';
    document.querySelector('.heading-actions')?.appendChild(customRange);
    customRange.onsubmit = async event => {
        event.preventDefault();
        const from = document.getElementById('dashboardFrom').value, to = document.getElementById('dashboardTo').value;
        if (from > to) return CP.notify('Ngày bắt đầu phải trước ngày kết thúc.');
        try {
            customFrom = from; customTo = to;
            await loadDashboardData();
        } catch (error) { CP.notify(error.message); }
    };
    const refreshTimer = setInterval(() => { if (!document.hidden) loadDashboardData(); }, 30000);
    window.addEventListener('pagehide', () => clearInterval(refreshTimer), { once: true });
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (searchInput) searchInput.focus();
        }
    });

    fetchBranches().then(() => {
        loadDashboardData();
    });
})();
