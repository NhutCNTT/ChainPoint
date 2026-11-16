// ChainPoint — Dashboard interactivity (Sales line chart, filters, tooltips, multi-branch data)
// Dữ liệu kết nối trực tiếp 100% với MySQL Backend API (không dùng mock data)

(function () {
    const getStorage = k => sessionStorage.getItem(k) || localStorage.getItem(k);
    const currentUserRole = getStorage('cp_role') || 'owner';
    const currentUserBranch = getStorage('cp_branch') || '';
    const currentBranchId = getStorage('cp_branch_id') || null;

    let branchesList = [];
    let selectedBranchId = (currentUserRole === 'manager' && currentBranchId) ? currentBranchId : 'all';
    let currentMetric = 'revenue';
    let currentMetricsData = {
        totalRevenue: 0,
        revenueGrowth: '+0.0%',
        totalOrders: 0,
        ordersGrowth: '+0.0%',
        totalCustomers: 0,
        customerGrowth: '+0.0%'
    };
    let currentChartPoints = [];

    const formatVND = n => (Number(n) || 0).toLocaleString('vi-VN') + ' ₫';

    // DOM Elements
    const branchSelector = document.getElementById('dashboardBranchSelector');
    const dashboardTitle = document.getElementById('dashboardTitle');
    const dashboardSub = document.getElementById('dashboardSubtitle');
    const metricRevenue = document.getElementById('metricRevenueValue');
    const metricOrders = document.getElementById('metricOrdersValue');
    const metricCustomers = document.getElementById('metricCustomersValue');
    const chartLegendCurrent = document.getElementById('chartLegendCurrent');

    const tooltip = document.getElementById('chartTooltip');
    const tooltipDate = document.getElementById('tooltipDate');
    const tooltipValue = document.getElementById('tooltipValue');
    const tooltipSub = document.getElementById('tooltipSub');
    const hoverGuide = document.getElementById('hoverGuide');
    const chartSvg = document.querySelector('.chart-svg');

    const API_BASE = (typeof window !== 'undefined' && window.location.port && window.location.port !== '8080' && window.location.port !== '') 
        ? 'http://localhost:8080/api/v1' 
        : ((typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') ? `${window.location.origin}/api/v1` : 'http://localhost:8080/api/v1');

    // 1. Nạp danh sách chi nhánh thực tế từ MySQL
    async function fetchBranches() {
        try {
            const res = await fetch(`${API_BASE}/branches`);
            if (res.ok) {
                branchesList = await res.json();
            }
        } catch (e) {
            console.warn('Không thể nạp danh sách chi nhánh từ MySQL API:', e);
            branchesList = [];
        }
        initBranchSelector();
    }

    function initBranchSelector() {
        if (!branchSelector) return;

        if (currentUserRole === 'manager') {
            const currentB = branchesList.find(b => String(b.id) === String(currentBranchId)) || { name: currentUserBranch || 'Chi nhánh' };
            branchSelector.innerHTML = `<option value="${currentBranchId || ''}">📍 ${currentB.name}</option>`;
            branchSelector.disabled = true;
        } else {
            let options = `<option value="all">🌐 Toàn chuỗi nhà hàng (Tổng hợp ${branchesList.length} CN)</option>`;
            branchesList.forEach(b => {
                options += `<option value="${b.id}">📍 ${b.name} (${b.code || ''})</option>`;
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
        const queryBranch = (selectedBranchId && selectedBranchId !== 'all') ? `?branchId=${selectedBranchId}` : '';

        // Tải metrics từ MySQL
        try {
            const resMetrics = await fetch(`${API_BASE}/admin/dashboard/metrics${queryBranch}`);
            if (resMetrics.ok) {
                const data = await resMetrics.json();
                currentMetricsData = {
                    totalRevenue: data.totalRevenue || 0,
                    revenueGrowth: data.revenueGrowth || '+0.0%',
                    totalOrders: data.totalOrders || 0,
                    ordersGrowth: data.ordersGrowth || '+0.0%',
                    totalCustomers: data.totalCustomers || 0,
                    customerGrowth: data.customerGrowth || '+0.0%'
                };
            } else {
                currentMetricsData = { totalRevenue: 0, revenueGrowth: '+0.0%', totalOrders: 0, ordersGrowth: '+0.0%', totalCustomers: 0, customerGrowth: '+0.0%' };
            }
        } catch (err) {
            currentMetricsData = { totalRevenue: 0, revenueGrowth: '+0.0%', totalOrders: 0, ordersGrowth: '+0.0%', totalCustomers: 0, customerGrowth: '+0.0%' };
        }

        // Tải biểu đồ doanh thu từ MySQL
        try {
            const resChart = await fetch(`${API_BASE}/admin/dashboard/revenue-chart${queryBranch}`);
            if (resChart.ok) {
                const chartData = await resChart.json();
                if (chartData && Array.isArray(chartData.points)) {
                    currentChartPoints = chartData.points;
                } else {
                    currentChartPoints = [];
                }
            } else {
                currentChartPoints = [];
            }
        } catch (err) {
            currentChartPoints = [];
        }

        updateDashboardUI();
        updateOpenBranchesBadge();
        loadTopDishes(queryBranch);
        renderBranchPerformance();
    }

    function updateOpenBranchesBadge() {
        const badge = document.getElementById('openBranchesCount');
        if (badge) {
            const openCount = branchesList.filter(b => b.status === 'open').length;
            badge.textContent = `${openCount} chi nhánh đang mở`;
        }
    }

    async function loadTopDishes(queryBranch) {
        const tbody = document.getElementById('topDishesBody');
        if (!tbody) return;
        try {
            const res = await fetch(`${API_BASE}/admin/dashboard/top-dishes${queryBranch}`);
            if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list) && list.length > 0) {
                    tbody.innerHTML = list.map(item => `
                        <tr>
                            <td>
                                <div class="dish-item">
                                    <div class="dish-icon">${item.emoji || '🍽️'}</div>
                                    <div class="dish-info">
                                        <strong>${item.name}</strong>
                                        <small>${item.category || 'Món ăn'}</small>
                                    </div>
                                </div>
                            </td>
                            <td><strong>${item.quantity || item.soldCount || 0}</strong> suất</td>
                            <td style="font-weight: 700; color: var(--text);">${formatVND(item.revenue || 0)}</td>
                        </tr>
                    `).join('');
                    return;
                }
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

        const totalChainRev = branchesList.reduce((acc, b) => acc + (b.weeklyRevenue || 0), 0) || 1;

        container.innerHTML = branchesList.map(b => {
            const rev = b.weeklyRevenue || 0;
            const pct = totalChainRev > 0 ? Math.round((rev / totalChainRev) * 100) : 0;
            return `
                <div class="branch-item" style="margin-bottom: 16px;">
                    <div class="branch-meta" style="display:flex; justify-content:space-between; margin-bottom: 6px;">
                        <span class="branch-name" style="font-weight: 700;">📍 ${b.name} (${b.code || ''})</span>
                        <span class="branch-sales" style="font-weight: 800; color: var(--primary);">${formatVND(rev)}</span>
                    </div>
                    <div class="branch-bar-bg" style="height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                        <div class="branch-bar-fill" style="width: ${pct}%; height: 100%; background: var(--primary); border-radius: 999px;"></div>
                    </div>
                    <div class="branch-sub" style="display:flex; justify-content:space-between; font-size: 12px; color: var(--muted); margin-top: 4px;">
                        <span>Quản lý: ${b.managerName || 'Chưa chỉ định'}</span>
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
        if (metricOrders) metricOrders.innerHTML = `${currentMetricsData.totalOrders.toLocaleString('vi-VN')} <span style="font-size: 20px; font-weight: 600; color: var(--muted);">đơn</span>`;
        if (metricCustomers) metricCustomers.innerHTML = `${currentMetricsData.totalCustomers.toLocaleString('vi-VN')} <span style="font-size: 20px; font-weight: 600; color: var(--muted);">khách</span>`;

        if (chartLegendCurrent) {
            chartLegendCurrent.textContent = `Tuần này (${formatVND(currentMetricsData.totalRevenue)})`;
        }

        renderChartSVG();
    }

    // 3. Vẽ biểu đồ động từ dữ liệu MySQL
    function renderChartSVG() {
        const defaultDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
        const points = (currentChartPoints && currentChartPoints.length > 0)
            ? currentChartPoints
            : defaultDays.map(d => ({ day: d, val: 0, label: '0 ₫', orders: 0, growth: '+0.0%' }));

        const maxVal = Math.max(...points.map(p => Number(p.val) || 0), 1000000);
        const svgW = 760;
        const svgH = 240;
        const padX = 50;
        const padYTop = 30;
        const padYBottom = 40;
        const plotW = svgW - padX * 2;
        const plotH = svgH - padYTop - padYBottom;

        const coords = points.map((p, idx) => {
            const x = padX + (idx / Math.max(points.length - 1, 1)) * plotW;
            const ratio = (Number(p.val) || 0) / maxVal;
            const y = (svgH - padYBottom) - ratio * plotH;
            return { x, y, ...p };
        });

        const linePath = coords.map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ');
        const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${svgH - padYBottom} L ${coords[0].x} ${svgH - padYBottom} Z`;

        const chartLine = document.querySelector('.chart-line-current');
        const chartArea = document.querySelector('.chart-area-current');
        if (chartLine) chartLine.setAttribute('d', linePath);
        if (chartArea) chartArea.setAttribute('d', areaPath);

        // Update dynamic Y-axis labels
        const yTop = document.getElementById('yAxisTop');
        const yMidHigh = document.getElementById('yAxisMidHigh');
        const yMidLow = document.getElementById('yAxisMidLow');
        if (yTop) yTop.textContent = formatVND(maxVal);
        if (yMidHigh) yMidHigh.textContent = formatVND(Math.round(maxVal * 2 / 3));
        if (yMidLow) yMidLow.textContent = formatVND(Math.round(maxVal / 3));

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
            circle.setAttribute('data-index', idx);

            circle.addEventListener('mouseenter', () => {
                tooltipDate.textContent = `${c.day} (Tuần này)`;
                tooltipValue.textContent = currentMetric === 'revenue' 
                    ? `${formatVND(c.val)} (${c.orders || 0} đơn)` 
                    : `${c.orders || 0} đơn`;
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
            loadDashboardData();
        });
    });

    // Keyboard shortcut (Ctrl+K)
    const searchInput = document.getElementById('searchInput');
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
