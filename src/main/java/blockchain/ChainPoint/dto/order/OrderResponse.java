package blockchain.ChainPoint.dto.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {
    private Long id;
    private String billCode;
    private Long branchId;
    private String branchName;
    private String tableCode;
    private String cashierUsername;
    private String customerPhone;
    private String customerName;
    private BigDecimal grossAmount;
    private BigDecimal discountAmount;
    private Long pointsUsed;
    private Long pointsEarned;
    private BigDecimal finalAmount;
    private String paymentMethod;
    private String status;
    private String billHash;
    private String blockchainTxHash;
    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemResponse {
        private Long productId;
        private String productName;
        private BigDecimal unitPrice;
        private Integer quantity;
        private BigDecimal subtotal;
    }
}
