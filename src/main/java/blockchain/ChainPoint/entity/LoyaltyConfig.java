package blockchain.ChainPoint.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "loyalty_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyConfig {

    @Id
    private Long id;

    @Builder.Default
    @Column(name = "earn_ratio_vnd", nullable = false)
    private Long earnRatioVnd = 10_000L;

    @Builder.Default
    @Column(name = "point_value_vnd", nullable = false)
    private Long pointValueVnd = 1_000L;

    @Builder.Default
    @Column(name = "min_points_to_redeem", nullable = false)
    private Long minPointsToRedeem = 5L;

    @Builder.Default
    @Column(name = "max_discount_percent", nullable = false)
    private Integer maxDiscountPercent = 50;

    @Builder.Default
    @Column(name = "point_expiry_days", nullable = false)
    private Integer pointExpiryDays = 365;

    @Builder.Default
    @Column(name = "allow_earn", nullable = false)
    private Boolean allowEarn = true;

    @Builder.Default
    @Column(name = "allow_redeem", nullable = false)
    private Boolean allowRedeem = true;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
