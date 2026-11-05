// ChainPoint — Dashboard interactivity (Sales line chart, filters, tooltips, multi-branch data)
// Used by: pages/admin/dashboard.html

(function () {
    const getStorage = k => sessionStorage.getItem(k) || localStorage.getItem(k);
    const currentUserRole = getStorage('cp_role') || 'owner';
    const currentUserBranch = getStorage('cp_branch') || 'Chi nhánh Quận 1';

    // Dữ liệu theo từng chi nhánh và toàn chuỗi
    const branchDatasets = {
        all: {
            name: 'Toàn chuỗi nhà hàng',
            totalRevenue: '128.450.000 ₫',
            revenueGrowth: '+14.8%',
            totalOrders: '1.428',
            ordersGrowth: '+8.2%',
            totalCustomers: '3.890',
            customerGrowth: '+12.5%',
            revenueChart: [
                { day: 'Thứ 2', val: 14200000, label: '14.2M ₫', orders: 156, growth: '+6.2%', y: 117 },
                { day: 'Thứ 3', val: 16800000, label: '16.8M ₫', orders: 182, growth: '+9.1%', y: 102 },
                { day: 'Thứ 4', val: 15500000, label: '15.5M ₫', orders: 170, growth: '+4.5%', y: 110 },
                { day: 'Thứ 5', val: 19400000, label: '19.4M ₫', orders: 215, growth: '+12.0%', y: 88 },
                { day: 'Thứ 6', val: 24800000, label: '24.8M ₫', orders: 268, growth: '+18.4%', y: 58 },
                { day: 'Thứ 7', val: 21500000, label: '21.5M ₫', orders: 234, growth: '+14.2%', y: 76 },
                { day: 'Chủ nhật', val: 16250000, label: '16.25M ₫', orders: 203, growth: '+8.8%', y: 105 }
            ],
            ordersChart: [
                { day: 'Thứ 2', val: 156, label: '156 đơn', orders: 156, growth: '+5.0%', y: 120 },
                { day: 'Thứ 3', val: 182, label: '182 đơn', orders: 182, growth: '+8.2%', y: 105 },
                { day: 'Thứ 4', val: 170, label: '170 đơn', orders: 170, growth: '+3.9%', y: 112 },
                { day: 'Thứ 5', val: 215, label: '215 đơn', orders: 215, growth: '+11.4%', y: 85 },
                { day: 'Thứ 6', val: 268, label: '268 đơn', orders: 268, growth: '+16.1%', y: 55 },
                { day: 'Thứ 7', val: 234, label: '234 đơn', orders: 234, growth: '+12.5%', y: 75 },
                { day: 'Chủ nhật', val: 203, label: '203 đơn', orders: 203, growth: '+7.6%', y: 95 }
            ]
        },
        q1: {
            name: 'Chi nhánh Quận 1 (Trụ sở)',
            totalRevenue: '68.450.000 ₫',
            revenueGrowth: '+16.2%',
            totalOrders: '756',
            ordersGrowth: '+9.4%',
            totalCustomers: '2.120',
            customerGrowth: '+14.0%',
            revenueChart: [
                { day: 'Thứ 2', val: 7800000, label: '7.8M ₫', orders: 84, growth: '+8.2%', y: 130 },
                { day: 'Thứ 3', val: 9200000, label: '9.2M ₫', orders: 98, growth: '+10.5%', y: 118 },
                { day: 'Thứ 4', val: 8500000, label: '8.5M ₫', orders: 92, growth: '+5.2%', y: 124 },
                { day: 'Thứ 5', val: 10400000, label: '10.4M ₫', orders: 115, growth: '+13.1%', y: 108 },
                { day: 'Thứ 6', val: 13600000, label: '13.6M ₫', orders: 145, growth: '+21.0%', y: 85 },
                { day: 'Thứ 7', val: 11200000, label: '11.2M ₫', orders: 124, growth: '+15.4%', y: 102 },
                { day: 'Chủ nhật', val: 7750000, label: '7.75M ₫', orders: 98, growth: '+9.2%', y: 131 }
            ]
        },
        td: {
            name: 'Chi nhánh Thảo Điền',
            totalRevenue: '38.200.000 ₫',
            revenueGrowth: '+12.4%',
            totalOrders: '428',
            ordersGrowth: '+7.1%',
            totalCustomers: '1.150',
            customerGrowth: '+10.2%',
            revenueChart: [
                { day: 'Thứ 2', val: 4200000, label: '4.2M ₫', orders: 46, growth: '+5.1%', y: 145 },
                { day: 'Thứ 3', val: 4900000, label: '4.9M ₫', orders: 52, growth: '+7.4%', y: 140 },
                { day: 'Thứ 4', val: 4600000, label: '4.6M ₫', orders: 50, growth: '+4.0%', y: 142 },
                { day: 'Thứ 5', val: 5600000, label: '5.6M ₫', orders: 62, growth: '+9.8%', y: 135 },
                { day: 'Thứ 6', val: 7200000, label: '7.2M ₫', orders: 78, growth: '+15.2%', y: 125 },
                { day: 'Thứ 7', val: 6800000, label: '6.8M ₫', orders: 74, growth: '+12.0%', y: 128 },
                { day: 'Chủ nhật', val: 4900000, label: '4.9M ₫', orders: 66, growth: '+8.1%', y: 140 }
            ]
        },
        hk: {
            name: 'Chi nhánh Hoàn Kiếm',
            totalRevenue: '21.800.000 ₫',
            revenueGrowth: '+11.0%',
            totalOrders: '244',
            ordersGrowth: '+6.5%',
            totalCustomers: '620',
            customerGrowth: '+8.9%',
            revenueChart: [
                { day: 'Thứ 2', val: 2200000, label: '2.2M ₫', orders: 26, growth: '+4.0%', y: 165 },
                { day: 'Thứ 3', val: 2700000, label: '2.7M ₫', orders: 32, growth: '+6.5%', y: 160 },
                { day: 'Thứ 4', val: 2400000, label: '2.4M ₫', orders: 28, growth: '+3.5%', y: 163 },
                { day: 'Thứ 5', val: 3400000, label: '3.4M ₫', orders: 38, growth: '+10.2%', y: 154 },
                { day: 'Thứ 6', val: 4000000, label: '4.0M ₫', orders: 45, growth: '+14.0%', y: 148 },
                { day: 'Thứ 7', val: 3500000, label: '3.5M ₫', orders: 36, growth: '+11.2%', y: 153 },
                { day: 'Chủ nhật', val: 3600000, label: '3.6M ₫', orders: 39, growth: '+8.4%', y: 152 }
            ]
        }
    };

    let selectedBranchKey = 'all';

    // Nếu người dùng là Manager -> tự động khóa chi nhánh về chi nhánh của Manager
    if (currentUserRole === 'manager') {
        if (currentUserBranch.includes('Thảo Điền')) selectedBranchKey = 'td';
        else if (currentUserBranch.includes('Hoàn Kiếm')) selectedBranchKey = 'hk';
        else selectedBranchKey = 'q1';
    }

    let currentMetric = 'revenue';

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
    const dataPoints = document.querySelectorAll('.data-point');
    const hoverGuide = document.getElementById('hoverGuide');

    function updateBranchUI() {
        const data = branchDatasets[selectedBranchKey] || branchDatasets.all;

        if (dashboardTitle) {
            dashboardTitle.textContent = currentUserRole === 'manager'
                ? `Tổng quan — ${data.name}`
                : (selectedBranchKey === 'all' ? 'Tổng quan chuỗi nhà hàng' : `Tổng quan — ${data.name}`);
        }
        if (dashboardSub) {
            dashboardSub.textContent = selectedBranchKey === 'all'
                ? 'Hiệu suất kinh doanh và tích điểm khách hàng trên toàn chuỗi nhà hàng.'
                : `Số liệu doanh thu, đơn hàng và khách hàng tại ${data.name}.`;
        }

        if (metricRevenue) metricRevenue.textContent = data.totalRevenue;
        if (metricOrders) metricOrders.innerHTML = `${data.totalOrders} <span style="font-size: 20px; font-weight: 600; color: var(--muted);">đơn</span>`;
        if (metricCustomers) metricCustomers.innerHTML = `${data.totalCustomers} <span style="font-size: 20px; font-weight: 600; color: var(--muted);">khách</span>`;

        if (chartLegendCurrent) {
            chartLegendCurrent.textContent = `Tuần này (${data.totalRevenue})`;
        }
    }

    function initBranchSelector() {
        if (!branchSelector) return;

        if (currentUserRole === 'manager') {
            const data = branchDatasets[selectedBranchKey];
            branchSelector.innerHTML = `<option value="${selectedBranchKey}">📍 ${data.name}</option>`;
            branchSelector.disabled = true;
        } else {
            branchSelector.innerHTML = `
                <option value="all">🌐 Toàn chuỗi nhà hàng (Tổng hợp 3 CN)</option>
                <option value="q1">📍 Chi nhánh Quận 1 (Trụ sở chính)</option>
                <option value="td">📍 Chi nhánh Thảo Điền</option>
                <option value="hk">📍 Chi nhánh Hoàn Kiếm</option>
            `;
            branchSelector.value = selectedBranchKey;
            branchSelector.addEventListener('change', (e) => {
                selectedBranchKey = e.target.value;
                updateBranchUI();
            });
        }
    }

    // Tooltip handling
    dataPoints.forEach((point) => {
        const index = parseInt(point.dataset.index, 10);

        point.addEventListener('mouseenter', () => {
            const data = branchDatasets[selectedBranchKey] || branchDatasets.all;
            const currentList = currentMetric === 'revenue' ? data.revenueChart : (data.ordersChart || data.revenueChart);
            const item = currentList[index];
            if (!item) return;

            tooltipDate.textContent = `${item.day} (Tuần này)`;
            tooltipValue.textContent = currentMetric === 'revenue' 
                ? `${item.label} (${item.orders} đơn)` 
                : `${item.label}`;
            tooltipSub.textContent = `Tăng trưởng: ${item.growth}`;

            const cx = parseFloat(point.getAttribute('cx'));
            const cy = parseFloat(point.getAttribute('cy'));

            const viewport = document.querySelector('.chart-viewport').getBoundingClientRect();
            const leftPx = (cx / 760) * viewport.width;
            const topPx = (cy / 240) * viewport.height;

            tooltip.style.left = `${leftPx}px`;
            tooltip.style.top = `${topPx}px`;
            tooltip.classList.add('is-active');

            if (hoverGuide) {
                hoverGuide.setAttribute('x1', cx);
                hoverGuide.setAttribute('x2', cx);
                hoverGuide.style.opacity = '1';
            }
        });

        point.addEventListener('mouseleave', () => {
            tooltip.classList.remove('is-active');
            if (hoverGuide) hoverGuide.style.opacity = '0';
        });
    });

    // Toggle between "Doanh thu" and "Số lượng đơn"
    const metricPills = document.querySelectorAll('.chart-pill');
    metricPills.forEach(pill => {
        pill.addEventListener('click', () => {
            metricPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentMetric = pill.dataset.metric;
        });
    });

    // Time range filter tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
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

    initBranchSelector();
    updateBranchUI();
})();
