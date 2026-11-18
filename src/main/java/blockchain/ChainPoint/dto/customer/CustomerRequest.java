package blockchain.ChainPoint.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerRequest {

    @NotBlank(message = "Customer name is required")
    private String name;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^(03|05|07|08|09)[0-9]{8}$",
            message = "Phone number must have 10 digits starting with 03, 05, 07, 08 or 09")
    private String phone;

    private LocalDate dateOfBirth;

    private String tier;

    private Long points;

    private String walletAddress;

    private Long branchId;
}
