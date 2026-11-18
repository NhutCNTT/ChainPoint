package blockchain.ChainPoint.dto.pos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutResponse {

    private String billCode;

    private String tableCode;

    private BigDecimal grossAmount;

    private BigDecimal discountAmount;

    private Long pointsUsed;

    private Long pointsEarned;

    private Long pointsBalance;

    private String customerTier;

    private String customerPhone;

    private BigDecimal finalAmount;

    private String billHash;

    private String blockchainTxHash;

    private String status;

    private LocalDateTime createdAt;
}
