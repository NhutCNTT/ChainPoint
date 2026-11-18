package blockchain.ChainPoint.dto.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {
    private String refundTxHash;
    private String redeemTxHash;
    private String earnTxHash;

    private Long id;

    private String billCode;

    private Long branchId;

    private String branchName;

    private String tableCode;

    private String cashierUsername;

    private String customerName;

    private String customerPhone;

    private BigDecimal grossAmount;

    private BigDecimal discountAmount;

    private Long pointsUsed;

    private Long pointsEarned;

    private BigDecimal finalAmount;

    private String paymentMethod;

    private String status;

    private String billHash;

    private String blockchainTxHash;

    private String loyaltyTxHash;

    private String refundReason;

    private LocalDateTime createdAt;

    @Builder.Default
    private List<OrderItemResponse> items = new ArrayList<>();
}
