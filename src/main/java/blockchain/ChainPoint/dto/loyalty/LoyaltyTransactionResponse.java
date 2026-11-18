package blockchain.ChainPoint.dto.loyalty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyTransactionResponse {

    private String txCode;

    private Long customerId;

    private String customerCode;

    private String customerName;

    private String customerPhone;

    private String type;

    private Long pointsDelta;

    private Long balanceAfter;

    private String billCode;

    private String cashierUsername;

    private String note;

    private LocalDateTime createdAt;
}
