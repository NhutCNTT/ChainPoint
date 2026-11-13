package blockchain.ChainPoint.controller;

import blockchain.ChainPoint.dto.dashboard.DashboardMetricsResponse;
import blockchain.ChainPoint.dto.dashboard.RevenueChartResponse;
import blockchain.ChainPoint.dto.dashboard.TopDishResponse;
import blockchain.ChainPoint.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@CrossOrigin
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/metrics")
    public ResponseEntity<DashboardMetricsResponse> getMetrics(
            @RequestParam(required = false) Long branchId,
            @RequestParam(defaultValue = "7days") String range
    ) {
        return ResponseEntity.ok(dashboardService.getMetrics(branchId, range));
    }

    @GetMapping("/revenue-chart")
    public ResponseEntity<RevenueChartResponse> getRevenueChart(
            @RequestParam(required = false) Long branchId
    ) {
        return ResponseEntity.ok(dashboardService.getWeeklyRevenueChart(branchId));
    }

    @GetMapping("/top-dishes")
    public ResponseEntity<List<TopDishResponse>> getTopDishes(
            @RequestParam(required = false) Long branchId,
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(dashboardService.getTopDishes(branchId, limit));
    }
}
