package blockchain.ChainPoint.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "loyalty_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Builder.Default
    @Column(name = "earn_ratio_vnd", nullable = false, precision = 15, scale = 2)
    private BigDecimal earnRatioVnd = BigDecimal.valueOf(10000.0);

    @Builder.Default
    @Column(name = "point_value_vnd", nullable = false, precision = 15, scale = 2)
    private BigDecimal pointValueVnd = BigDecimal.valueOf(1000.0);

    @Builder.Default
    @Column(name = "min_points_to_redeem", nullable = false)
    private Integer minPointsToRedeem = 5;

    @Builder.Default
    @Column(name = "max_discount_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxDiscountPercent = BigDecimal.valueOf(50.0);

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
