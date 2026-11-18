package blockchain.ChainPoint.dto.order;

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
public class RefundResponse {

    private String billCode;

    private BigDecimal actualRefundAmount;

    private Long pointsRestored;

    private Long pointsRevoked;

    private String processedBy;

    private String blockchainTxHash;

    private String status;

    private String reason;
}
