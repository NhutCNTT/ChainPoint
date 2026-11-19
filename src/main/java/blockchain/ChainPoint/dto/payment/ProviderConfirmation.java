package blockchain.ChainPoint.dto.payment;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProviderConfirmation {
    @NotBlank @Size(max = 32) private String billCode;
    @NotNull @PositiveOrZero private BigDecimal amount;
    @NotBlank @Size(max = 100) private String reference;
    @NotNull private Long timestamp;
}
