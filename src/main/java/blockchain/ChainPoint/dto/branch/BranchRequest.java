package blockchain.ChainPoint.dto.branch;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
public class BranchRequest {

    @NotBlank(message = "Branch code is required")
    private String code;

    @NotBlank(message = "Branch name is required")
    private String name;

    @NotBlank(message = "Branch address is required")
    private String address;

    private String phone;

    private String managerName;

    private String openHours;

    @Builder.Default
    @Pattern(
            regexp = "open|closed|paused|temporarily_closed",
            message = "Status must be one of: open, closed, paused, temporarily_closed"
    )
    private String status = "open";

    @Builder.Default
    @DecimalMin(value = "0.0", message = "VAT percent cannot be negative")
    @DecimalMax(value = "100.0", message = "VAT percent cannot exceed 100")
    private BigDecimal vatPercent = BigDecimal.valueOf(8);
}
