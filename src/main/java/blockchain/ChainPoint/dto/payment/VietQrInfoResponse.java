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
public class VietQrInfoResponse {

    private String billCode;

    private BigDecimal amount;

    private String bankCode;

    private String bankName;

    private String accountName;

    private String accountNumber;

    private String qrImageUrl;
}
