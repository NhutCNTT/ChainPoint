package blockchain.ChainPoint.dto.auth;

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
public class RegisterResponse {

    private String accessToken;

    @Builder.Default
    private String tokenType = "Bearer";

    private Long userId;
    private String username;
    private String fullName;
    private String phone;
    private String role;

    private Long branchId;
    private String branchName;
    private String branchCode;
    private String province;

    private String message;
}
