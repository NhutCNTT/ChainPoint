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
public class TopDishResponse {

    private String name;

    private String category;

    private String emoji;

    private Long quantitySold;

    private BigDecimal totalRevenue;
}
