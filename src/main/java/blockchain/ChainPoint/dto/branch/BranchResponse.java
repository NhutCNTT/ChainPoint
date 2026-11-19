package blockchain.ChainPoint.dto.branch;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchResponse {

    private Long id;

    private String code;

    private String name;

    private String address;

    private String phone;

    private String status;

    private String managerName;

    private String openHours;

    private Boolean autoPrint;

    private BigDecimal vatPercent;

    private Long tablesCount;

    private Long staffCount;

    private BigDecimal weeklyRevenue;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
