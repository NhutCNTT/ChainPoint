package blockchain.ChainPoint.dto.order;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundRequest {

    private String managerUsername;

    @Size(max = 255, message = "Refund reason cannot exceed 255 characters")
    private String reason;
}
