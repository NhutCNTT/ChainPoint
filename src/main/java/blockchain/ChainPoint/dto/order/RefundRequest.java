package blockchain.ChainPoint.dto.order;

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
public class RefundRequest {

    /**
     * Username của Quản lý / Chủ cửa hàng duyệt hoàn tiền
     */
    private String managerUsername;

    /**
     * Lý do hoàn tiền (VD: Khách đổi món, lỗi phục vụ, sai hóa đơn)
     */
    @NotBlank(message = "Lý do hoàn tiền không được để trống")
    private String reason;

    /**
     * Số tiền hoàn lại dự kiến (nếu null, hệ thống tự lấy finalAmount của Bill)
     */
    private BigDecimal refundAmount;
}
