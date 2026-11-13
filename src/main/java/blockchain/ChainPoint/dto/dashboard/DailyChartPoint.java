package blockchain.ChainPoint.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyChartPoint {

    private String day;

    private LocalDate date;

    private BigDecimal val;

    private String label;

    private Long orders;

    private String growth;
}
