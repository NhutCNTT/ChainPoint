package blockchain.ChainPoint.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "loyalty_transactions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_loyalty_transaction_bill_type",
                columnNames = {"bill_code", "type"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tx_code", nullable = false, unique = true, length = 48)
    private String txCode;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "type", nullable = false, length = 16)
    private String type;

    @Column(name = "points_delta", nullable = false)
    private Long pointsDelta;

    @Column(name = "balance_after", nullable = false)
    private Long balanceAfter;

    @Column(name = "bill_code", nullable = false, length = 32)
    private String billCode;

    @Column(name = "cashier_username", length = 50)
    private String cashierUsername;

    @Column(name = "note", length = 255)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
