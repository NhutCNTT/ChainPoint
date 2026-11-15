package blockchain.ChainPoint.dto.payment;

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
public class BankWebhookPayload {

    private String gateway;
    private String transactionDate;
    private String accountNumber;
    private BigDecimal transferAmount;
    private String content;
    private String referenceCode;
    private String billCode;
}
