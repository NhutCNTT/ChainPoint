package blockchain.ChainPoint.dto.pos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequest {

    @jakarta.validation.constraints.Size(max = 80)
    private String checkoutReference;

    @jakarta.validation.constraints.DecimalMin("0.0")
    private java.math.BigDecimal expectedAmount;

    @jakarta.validation.constraints.DecimalMin("0.0")
    private java.math.BigDecimal receivedAmount;

    @NotNull(message = "Branch ID is required")
    @Positive(message = "Branch ID must be positive")
    private Long branchId;

    @NotBlank(message = "Table code is required")
    private String tableCode;

    private String cashierUsername;

    private String customerPhone;

    @Builder.Default
    @PositiveOrZero(message = "Points to use must be zero or positive")
    private Long pointsToUse = 0L;

    @NotBlank(message = "Payment method is required")
    @Pattern(regexp = "cash|transfer", message = "Payment method must be cash or transfer")
    private String paymentMethod;

    @NotEmpty(message = "Checkout must contain at least one item")
    @Valid
    private List<CheckoutItemRequest> items;
}
