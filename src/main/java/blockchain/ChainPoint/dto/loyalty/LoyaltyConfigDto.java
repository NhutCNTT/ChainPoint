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

    private Long earnRatioVnd;

    private Long pointValueVnd;

    private Long minPointsToRedeem;

    private Integer maxDiscountPercent;

    private Integer pointExpiryDays;

    private Boolean allowEarn;

    private Boolean allowRedeem;
}
