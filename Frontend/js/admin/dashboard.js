// ChainPoint — Dashboard interactivity (Sales line chart, filters, tooltips)
// Used by: pages/admin/dashboard.html

(function () {
    // Dataset for Weekly Sales (Thứ 2 -> Chủ nhật)
    const datasets = {
        revenue: {
            unit: '₫',
            label: 'Doanh thu',
            thisWeek: [
                { day: 'Thứ 2', val: 14200000, label: '14.2M ₫', orders: 156, growth: '+6.2%' },
                { day: 'Thứ 3', val: 16800000, label: '16.8M ₫', orders: 182, growth: '+9.1%' },
                { day: 'Thứ 4', val: 15500000, label: '15.5M ₫', orders: 170, growth: '+4.5%' },
                { day: 'Thứ 5', val: 19400000, label: '19.4M ₫', orders: 215, growth: '+12.0%' },
                { day: 'Thứ 6', val: 24800000, label: '24.8M ₫', orders: 268, growth: '+18.4%' },
                { day: 'Thứ 7', val: 21500000, label: '21.5M ₫', orders: 234, growth: '+14.2%' },
                { day: 'Chủ nhật', val: 16250000, label: '16.25M ₫', orders: 203, growth: '+8.8%' }
            ],
            total: '128.450.000 ₫',
            growth: '+14.8%'
        },
        orders: {
            unit: 'đơn',
            label: 'Đơn hàng',
            thisWeek: [
                { day: 'Thứ 2', val: 156, label: '156 đơn', orders: 156, growth: '+5.0%' },
                { day: 'Thứ 3', val: 182, label: '182 đơn', orders: 182, growth: '+8.2%' },
                { day: 'Thứ 4', val: 170, label: '170 đơn', orders: 170, growth: '+3.9%' },
                { day: 'Thứ 5', val: 215, label: '215 đơn', orders: 215, growth: '+11.4%' },
                { day: 'Thứ 6', val: 268, label: '268 đơn', orders: 268, growth: '+16.1%' },
                { day: 'Thứ 7', val: 234, label: '234 đơn', orders: 234, growth: '+12.5%' },
                { day: 'Chủ nhật', val: 203, label: '203 đơn', orders: 203, growth: '+7.6%' }
            ],
            total: '1.428 đơn',
            growth: '+8.2%'
        }
    };

    let currentMetric = 'revenue';

    // Tooltip handling
    const tooltip = document.getElementById('chartTooltip');
    const tooltipDate = document.getElementById('tooltipDate');
    const tooltipValue = document.getElementById('tooltipValue');
    const tooltipSub = document.getElementById('tooltipSub');
    const dataPoints = document.querySelectorAll('.data-point');
    const hoverGuide = document.getElementById('hoverGuide');

    dataPoints.forEach((point) => {
        const index = parseInt(point.dataset.index, 10);

        point.addEventListener('mouseenter', (e) => {
            const data = datasets[currentMetric].thisWeek[index];
            if (!data) return;

            tooltipDate.textContent = `${data.day} (Tuần này)`;
            tooltipValue.textContent = currentMetric === 'revenue' 
                ? `${data.label} (${data.orders} đơn)` 
                : `${data.label}`;
            tooltipSub.textContent = `Tăng trưởng: ${data.growth}`;

            const cx = parseFloat(point.getAttribute('cx'));
            const cy = parseFloat(point.getAttribute('cy'));

            // Map SVG coordinates to percentage in viewport
            const svg = document.getElementById('salesSvg');
            const svgRect = svg.getBoundingClientRect();
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

    // Time range filter tabs ("Hôm nay", "7 ngày qua", "30 ngày qua", "Năm nay")
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // Keyboard shortcut (Ctrl+K / Cmd+K) to focus search
    const searchInput = document.getElementById('searchInput');
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (searchInput) searchInput.focus();
        }
    });
})();

