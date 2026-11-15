package blockchain.ChainPoint.dto.customer;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerResponse {
    private Long id;
    private String code;
    private String name;
    private String phone;
    private LocalDate dateOfBirth;
    private String tier;
    private Long points;
    private BigDecimal totalSpent;
    private String walletAddress;
    private Long branchId;
    private String branchName;
    private LocalDateTime createdAt;
}
