package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.dashboard.DashboardMetricsResponse;
import blockchain.ChainPoint.dto.dashboard.RevenueChartResponse;
import blockchain.ChainPoint.dto.dashboard.TopDishResponse;

import java.util.List;

public interface DashboardService {

    DashboardMetricsResponse getMetrics(Long branchId, String range, java.time.LocalDate from, java.time.LocalDate to);

    RevenueChartResponse getWeeklyRevenueChart(Long branchId);

    List<TopDishResponse> getTopDishes(Long branchId, int limit);
}
