package blockchain.ChainPoint.dto.table;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
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
public class DiningTableRequest {

    @NotBlank(message = "Table code is required")
    private String code;

    @NotBlank(message = "Table name is required")
    private String name;

    @NotBlank(message = "Table area is required")
    private String area;

    @NotNull(message = "Seats count is required")
    @Min(value = 1, message = "Seats count must be at least 1")
    private Integer seats;

    @Builder.Default
    @Pattern(
            regexp = "active|disabled",
            message = "Status must be either active or disabled"
    )
    private String status = "active";

    private String note;

    @NotNull(message = "Branch ID is required")
    @Positive(message = "Branch ID must be positive")
    private Long branchId;
}
