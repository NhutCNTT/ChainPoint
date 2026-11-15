package blockchain.ChainPoint.dto.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private String billCode;
    private String status;
    private Long pointsRestored;
    private Long pointsRevoked;
    private BigDecimal actualRefundAmount;
    private String reason;
    private String processedBy;
    private String blockchainTxHash;
    private LocalDateTime refundedAt;
    private String message;
}
