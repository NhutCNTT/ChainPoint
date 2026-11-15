package blockchain.ChainPoint.dto.payment;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VietQRInfoResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private String bankBin;
    private String bankName;
    private String accountNumber;
    private String accountName;
    private String qrTemplate;
    private String qrImageUrl;
    private String billCode;
    private BigDecimal amount;
    private String description;
}
