package blockchain.ChainPoint.dto.staff;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffResponse {
    private Long id;
    private String username;
    private String fullName;
    private String phone;
    private String email;
    private String role;
    private Long branchId;
    private String branchName;
    private String status;
    private LocalDateTime createdAt;
}
