package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.dashboard.DailyChartPoint;
import blockchain.ChainPoint.dto.dashboard.DashboardMetricsResponse;
import blockchain.ChainPoint.dto.dashboard.RevenueChartResponse;
import blockchain.ChainPoint.dto.dashboard.TopDishResponse;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.repository.BillDetailRepository;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.repository.CustomerRepository;
import blockchain.ChainPoint.repository.DiningTableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String RANGE_TODAY = "today";
    private static final String RANGE_7_DAYS = "7days";
    private static final String RANGE_30_DAYS = "30days";
    private static final String RANGE_YEAR = "year";
    private static final String[] WEEK_DAY_LABELS = {
            "Thứ 2",
            "Thứ 3",
            "Thứ 4",
            "Thứ 5",
            "Thứ 6",
            "Thứ 7",
            "Chủ nhật"
    };
    private static final int DAYS_IN_WEEK = 7;
    private static final int DEFAULT_TOP_DISHES_LIMIT = 5;
    private static final BigDecimal THOUSAND = BigDecimal.valueOf(1_000L);
    private static final BigDecimal MILLION = BigDecimal.valueOf(1_000_000L);
    private static final BigDecimal BILLION = BigDecimal.valueOf(1_000_000_000L);
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100L);

    private final BillRepository billRepository;
    private final DiningTableRepository diningTableRepository;
    private final CustomerRepository customerRepository;
    private final BillDetailRepository billDetailRepository;

    @Override
    public DashboardMetricsResponse getMetrics(Long branchId, String range) {
        LocalDate today = LocalDate.now(ZONE_ID);
        MetricsWindow window = resolveMetricsWindow(range, today);

        BigDecimal currentRevenue = money(billRepository.sumRevenueBetween(
                branchId,
                window.currentStart(),
                window.currentEnd()
        ));
        BigDecimal previousRevenue = money(billRepository.sumRevenueBetween(
                branchId,
                window.previousStart(),
                window.previousEnd()
        ));

        long currentOrders = count(billRepository.countOrdersBetween(
                branchId,
                window.currentStart(),
                window.currentEnd()
        ));
        long previousOrders = count(billRepository.countOrdersBetween(
                branchId,
                window.previousStart(),
                window.previousEnd()
        ));

        long newCustomers = count(customerRepository.countNewCustomersBetween(
                branchId,
                window.currentStart(),
                window.currentEnd()
        ));
        long previousNewCustomers = count(customerRepository.countNewCustomersBetween(
                branchId,
                window.previousStart(),
                window.previousEnd()
        ));

        return DashboardMetricsResponse.builder()
                .totalRevenue(currentRevenue)
                .revenueGrowth(formatGrowth(calculateGrowth(currentRevenue, previousRevenue)))
                .totalOrders(currentOrders)
                .ordersGrowth(formatGrowth(calculateGrowth(currentOrders, previousOrders)))
                .totalCustomers(count(customerRepository.countTotalCustomers(branchId)))
                .customerGrowth(formatGrowth(calculateGrowth(newCustomers, previousNewCustomers)))
                .activeTablesCount(count(diningTableRepository.countBusyTables(branchId)))
                .build();
    }

    @Override
    public RevenueChartResponse getWeeklyRevenueChart(Long branchId) {
        LocalDate today = LocalDate.now(ZONE_ID);
        LocalDate currentMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate lastMonday = currentMonday.minusWeeks(1);
        LocalDate weekBeforeLastMonday = currentMonday.minusWeeks(2);
        LocalDate currentSunday = currentMonday.plusDays(DAYS_IN_WEEK - 1);

        List<Bill> paidBills = billRepository.findPaidBillsBetween(
                branchId,
                weekBeforeLastMonday.atStartOfDay(),
                currentSunday.atTime(LocalTime.MAX)
        );

        Map<LocalDate, DayTotals> totalsByDate = new HashMap<>();
        for (Bill bill : paidBills) {
            if (bill == null || bill.getCreatedAt() == null) {
                continue;
            }

            totalsByDate
                    .computeIfAbsent(bill.getCreatedAt().toLocalDate(), key -> new DayTotals())
                    .add(bill.getFinalAmount());
        }

        List<DailyChartPoint> thisWeek = buildDailyPoints(currentMonday, lastMonday, totalsByDate);
        List<DailyChartPoint> lastWeek = buildDailyPoints(lastMonday, weekBeforeLastMonday, totalsByDate);
        BigDecimal thisWeekTotal = totalRevenue(thisWeek);
        BigDecimal lastWeekTotal = totalRevenue(lastWeek);

        return RevenueChartResponse.builder()
                .thisWeekTotal(thisWeekTotal)
                .lastWeekTotal(lastWeekTotal)
                .overallGrowth(formatGrowth(calculateGrowth(thisWeekTotal, lastWeekTotal)))
                .thisWeek(thisWeek)
                .lastWeek(lastWeek)
                .build();
    }

    @Override
    public List<TopDishResponse> getTopDishes(Long branchId, int limit) {
        int pageSize = limit > 0 ? limit : DEFAULT_TOP_DISHES_LIMIT;

        return billDetailRepository.findTopSellingDishes(branchId, PageRequest.of(0, pageSize))
                .stream()
                .map(this::toTopDishResponse)
                .toList();
    }

    private MetricsWindow resolveMetricsWindow(String range, LocalDate today) {
        LocalDateTime endOfToday = today.atTime(LocalTime.MAX);

        return switch (normalizeRange(range)) {
            case RANGE_TODAY -> new MetricsWindow(
                    today.atStartOfDay(),
                    endOfToday,
                    today.minusDays(1).atStartOfDay(),
                    today.minusDays(1).atTime(LocalTime.MAX)
            );
            case RANGE_30_DAYS -> {
                LocalDateTime currentStart = today.minusDays(29).atStartOfDay();
                yield new MetricsWindow(
                        currentStart,
                        endOfToday,
                        currentStart.minusDays(30),
                        currentStart.minusNanos(1)
                );
            }
            case RANGE_YEAR -> {
                LocalDateTime currentStart = today.withDayOfYear(1).atStartOfDay();
                yield new MetricsWindow(
                        currentStart,
                        endOfToday,
                        currentStart.minusYears(1),
                        endOfToday.minusYears(1)
                );
            }
            default -> {
                LocalDateTime currentStart = today.minusDays(6).atStartOfDay();
                yield new MetricsWindow(
                        currentStart,
                        endOfToday,
                        currentStart.minusDays(7),
                        currentStart.minusNanos(1)
                );
            }
        };
    }

    private String normalizeRange(String range) {
        if (range == null || range.isBlank()) {
            return RANGE_7_DAYS;
        }

        return switch (range.trim().toLowerCase(Locale.ROOT)) {
            case RANGE_TODAY -> RANGE_TODAY;
            case RANGE_30_DAYS -> RANGE_30_DAYS;
            case RANGE_YEAR -> RANGE_YEAR;
            default -> RANGE_7_DAYS;
        };
    }

    private List<DailyChartPoint> buildDailyPoints(
            LocalDate weekStart,
            LocalDate comparisonWeekStart,
            Map<LocalDate, DayTotals> totalsByDate
    ) {
        List<DailyChartPoint> points = new ArrayList<>(DAYS_IN_WEEK);

        for (int index = 0; index < DAYS_IN_WEEK; index++) {
            LocalDate date = weekStart.plusDays(index);
            LocalDate comparisonDate = comparisonWeekStart.plusDays(index);

            DayTotals current = totalsByDate.get(date);
            DayTotals previous = totalsByDate.get(comparisonDate);
            BigDecimal revenue = money(current != null ? current.revenue : BigDecimal.ZERO);
            BigDecimal comparisonRevenue = money(previous != null ? previous.revenue : BigDecimal.ZERO);

            points.add(DailyChartPoint.builder()
                    .day(WEEK_DAY_LABELS[index])
                    .date(date)
                    .val(revenue)
                    .label(formatCurrencyLabel(revenue))
                    .orders(current != null ? current.orders : 0L)
                    .growth(formatGrowth(calculateGrowth(revenue, comparisonRevenue)))
                    .build());
        }

        return points;
    }

    private TopDishResponse toTopDishResponse(Object[] row) {
        String name = row != null && row.length > 0 && row[0] != null
                ? row[0].toString()
                : "";
        long quantitySold = row != null && row.length > 1 && row[1] instanceof Number quantity
                ? quantity.longValue()
                : 0L;
        BigDecimal revenue = row != null && row.length > 2
                ? toBigDecimal(row[2])
                : BigDecimal.ZERO;

        return TopDishResponse.builder()
                .name(name)
                .quantitySold(quantitySold)
                .totalRevenue(money(revenue))
                .build();
    }

    private BigDecimal calculateGrowth(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.signum() == 0) {
            return current != null && current.signum() > 0
                    ? HUNDRED
                    : BigDecimal.ZERO;
        }

        return current.subtract(previous)
                .divide(previous, 6, RoundingMode.HALF_UP)
                .multiply(HUNDRED);
    }

    private BigDecimal calculateGrowth(long current, long previous) {
        return calculateGrowth(BigDecimal.valueOf(current), BigDecimal.valueOf(previous));
    }

    private String formatGrowth(BigDecimal growth) {
        BigDecimal normalized = growth.setScale(1, RoundingMode.HALF_UP);
        String prefix = normalized.signum() > 0 ? "+" : "";
        return prefix + normalized.toPlainString() + "%";
    }

    private String formatCurrencyLabel(BigDecimal value) {
        BigDecimal amount = value != null ? value : BigDecimal.ZERO;
        BigDecimal absolute = amount.abs();

        if (absolute.compareTo(BILLION) >= 0) {
            return amount.divide(BILLION, 1, RoundingMode.HALF_UP).toPlainString() + "B ₫";
        }

        if (absolute.compareTo(MILLION) >= 0) {
            return amount.divide(MILLION, 1, RoundingMode.HALF_UP).toPlainString() + "M ₫";
        }

        if (absolute.compareTo(THOUSAND) >= 0) {
            return amount.divide(THOUSAND, 1, RoundingMode.HALF_UP).toPlainString() + "K ₫";
        }

        return amount.setScale(0, RoundingMode.HALF_UP).toPlainString() + " ₫";
    }

    private BigDecimal totalRevenue(List<DailyChartPoint> points) {
        BigDecimal total = BigDecimal.ZERO;

        for (DailyChartPoint point : points) {
            if (point.getVal() != null) {
                total = total.add(point.getVal());
            }
        }

        return money(total);
    }

    private BigDecimal money(BigDecimal value) {
        return value != null
                ? value.setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private long count(Long value) {
        return value != null ? value : 0L;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }

        if (value instanceof Number number) {
            return new BigDecimal(number.toString());
        }

        if (value != null) {
            try {
                return new BigDecimal(value.toString());
            } catch (NumberFormatException ignored) {
                return BigDecimal.ZERO;
            }
        }

        return BigDecimal.ZERO;
    }

    private record MetricsWindow(
            LocalDateTime currentStart,
            LocalDateTime currentEnd,
            LocalDateTime previousStart,
            LocalDateTime previousEnd
    ) {
    }

    private static final class DayTotals {

        private BigDecimal revenue = BigDecimal.ZERO;
        private long orders;

        private void add(BigDecimal amount) {
            if (amount != null) {
                revenue = revenue.add(amount);
            }
            orders++;
        }
    }
}
