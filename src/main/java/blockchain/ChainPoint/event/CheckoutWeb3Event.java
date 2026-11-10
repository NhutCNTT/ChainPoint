package blockchain.ChainPoint.event;

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
public class CheckoutWeb3Event implements Serializable {

    private static final long serialVersionUID = 1L;

    private String billCode;

    private Long branchId;

    private String customerPhone;

    private String walletAddress;

    private Long pointsEarned;

    private Long pointsUsed;

    private BigDecimal finalAmount;

    private String billHash;

    private LocalDateTime timestamp;
}
