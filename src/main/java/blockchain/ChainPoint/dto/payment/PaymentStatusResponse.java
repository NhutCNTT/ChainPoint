package blockchain.ChainPoint.dto.payment;

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
public class PaymentStatusResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private String billCode;
    private String status;
    private boolean paid;
    private BigDecimal amount;
    private LocalDateTime paidAt;
    private String paymentMethod;
    private String blockchainTxHash;
}
