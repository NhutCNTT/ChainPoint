package blockchain.ChainPoint.dto.loyalty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyConfigDto {

    @jakarta.validation.constraints.Positive
    private Long earnRatioVnd;

    @jakarta.validation.constraints.Positive
    private Long pointValueVnd;

    @jakarta.validation.constraints.Positive
    private Long minPointsToRedeem;

    @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(100)
    private Integer maxDiscountPercent;

    @jakarta.validation.constraints.Positive
    private Integer pointExpiryDays;

    private Boolean allowEarn;

    private Boolean allowRedeem;
}
