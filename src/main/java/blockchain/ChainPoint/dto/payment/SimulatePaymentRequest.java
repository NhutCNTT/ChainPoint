package blockchain.ChainPoint.dto.payment;

import jakarta.validation.constraints.NotBlank;
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
public class SimulatePaymentRequest {

    @NotBlank(message = "Bill code is required")
    private String billCode;

    private BigDecimal amount;
}
