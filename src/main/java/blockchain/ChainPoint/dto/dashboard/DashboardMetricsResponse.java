package blockchain.ChainPoint.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardMetricsResponse {

    private BigDecimal totalRevenue;

    private String revenueGrowth;

    private Long totalOrders;

    private String ordersGrowth;

    private Long totalCustomers;

    private String customerGrowth;

    private Long activeTablesCount;
}
