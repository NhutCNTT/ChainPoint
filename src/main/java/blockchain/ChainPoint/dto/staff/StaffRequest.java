package blockchain.ChainPoint.dto.staff;

import jakarta.validation.constraints.NotBlank;
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

    @NotBlank(message = "Tên đăng nhập không được để trống")
    private String username;

    private String password;

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    private String phone;
    private String email;

    @NotBlank(message = "Vai trò không được để trống")
    private String role; // ROLE_MANAGER, ROLE_CASHIER, ROLE_OWNER

    private Long branchId;
    private String status;
}
