package blockchain.ChainPoint.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bills")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bill_code", nullable = false, unique = true, length = 32)
    private String billCode;

    @Column(name = "request_key", unique = true, length = 64)
    private String requestKey;

    @Column(name = "table_code", nullable = false, length = 20)
    private String tableCode;

    @Column(name = "cashier_username", nullable = false, length = 50)
    private String cashierUsername;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "gross_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal grossAmount;

    @Builder.Default
    @Column(name = "discount_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "points_used", nullable = false)
    private Long pointsUsed = 0L;

    @Builder.Default
    @Column(name = "points_earned", nullable = false)
    private Long pointsEarned = 0L;

    @Column(name = "final_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal finalAmount;

    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "order_note", length = 500)
    private String note;

    @Column(name = "cash_received", precision = 15, scale = 2)
    private BigDecimal cashReceived;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "paid";

    @Column(name = "bill_hash", length = 64)
    private String billHash;

    @Column(name = "blockchain_tx_hash", length = 66)
    private String blockchainTxHash;

    @Column(name = "provider_reference", unique = true, length = 100)
    private String providerReference;

    @Builder.Default
    @Column(name = "blockchain_pending", nullable = false)
    private Boolean blockchainPending = false;

    @Builder.Default
    @Column(name = "redemption_reserved", nullable = false)
    private Boolean redemptionReserved = false;

    @Column(name = "redeem_tx_hash", length = 66)
    private String redeemTxHash;

    @Column(name = "loyalty_tx_hash", length = 66)
    private String loyaltyTxHash;

    @Column(name = "refund_reason", length = 255)
    private String refundReason;

    @Column(name = "refund_tx_hash", length = 66)
    private String refundTxHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @Builder.Default
    @OneToMany(
            mappedBy = "bill",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    private List<BillDetail> details = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
