package blockchain.ChainPoint.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "checkout_outbox")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class CheckoutOutbox {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Lob @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;
    private LocalDateTime publishedAt;
}
