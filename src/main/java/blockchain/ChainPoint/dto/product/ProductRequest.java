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
    private String code;

    @NotBlank(message = "Product name is required")
    private String name;

    @NotBlank(message = "Product category is required")
    @Pattern(
            regexp = "hot|cold|drink|dessert|other",
            message = "Category must be one of: hot, cold, drink, dessert, other"
    )
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

    private String imageUrl;
}
