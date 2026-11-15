package blockchain.ChainPoint.dto.branch;

import jakarta.validation.constraints.NotBlank;
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
public class BranchRequest {

    @NotBlank(message = "Mã chi nhánh không được để trống")
    private String code;

    @NotBlank(message = "Tên chi nhánh không được để trống")
    private String name;

    @NotBlank(message = "Địa chỉ chi nhánh không được để trống")
    private String address;

    private String phone;
    private String openHours;
    private String managerName;
    private BigDecimal vatPercent;
    private String status;
}
