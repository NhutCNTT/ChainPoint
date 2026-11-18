package blockchain.ChainPoint.dto.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
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
public class ProductRequest {

    @NotBlank(message = "Product code is required")
    @jakarta.validation.constraints.Size(max = 20)
    private String code;

    @NotBlank(message = "Product name is required")
    @jakarta.validation.constraints.Size(max = 150)
    private String name;

    @NotBlank(message = "Product category is required")
    @jakarta.validation.constraints.Size(max = 30)
    private String category;

    @NotNull(message = "Product price is required")
    @PositiveOrZero(message = "Product price must be zero or positive")
    private BigDecimal price;

    private String emoji;

    @Builder.Default
    @Pattern(
            regexp = "available|out_of_stock",
            message = "Status must be either available or out_of_stock"
    )
    private String status = "available";

    @Builder.Default
    @PositiveOrZero(message = "Stock quantity must be zero or positive")
    private Integer stockQuantity = 0;

    @jakarta.validation.constraints.Size(max = 1000)
    @jakarta.validation.constraints.Pattern(regexp = "^$|^https?://[^\\s]+$", message = "Image URL must use http or https")
    private String imageUrl;

    private Long branchId;
}
