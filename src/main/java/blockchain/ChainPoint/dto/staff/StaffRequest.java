package blockchain.ChainPoint.dto.staff;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
public class StaffRequest {

    @NotBlank(message = "Username is required")
    private String username;

    private String password;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String phone;

    @Email(message = "Email is invalid")
    private String email;

    @NotBlank(message = "Role is required")
    @Pattern(
            regexp = "ROLE_OWNER|ROLE_MANAGER|ROLE_CASHIER",
            message = "Role must be ROLE_OWNER, ROLE_MANAGER or ROLE_CASHIER"
    )
    private String role;

    private Long branchId;

    @Builder.Default
    @Pattern(
            regexp = "active|inactive|locked|disabled",
            message = "Status must be one of: active, inactive, locked, disabled"
    )
    private String status = "active";
}
