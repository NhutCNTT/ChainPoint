package blockchain.ChainPoint.repository;

import blockchain.ChainPoint.entity.CheckoutOutbox;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.List;

public interface CheckoutOutboxRepository extends JpaRepository<CheckoutOutbox, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<CheckoutOutbox> findFirst20ByPublishedAtIsNullOrderByIdAsc();
}
