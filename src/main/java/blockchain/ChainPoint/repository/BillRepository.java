package blockchain.ChainPoint.repository;

import blockchain.ChainPoint.entity.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {

    Optional<Bill> findByBillCode(String billCode);

    @Query("SELECT COALESCE(SUM(b.finalAmount), 0) FROM Bill b "
            + "WHERE (:branchId IS NULL OR b.branch.id = :branchId) "
            + "AND b.status = 'paid' "
            + "AND b.createdAt BETWEEN :startDate AND :endDate")
    BigDecimal sumRevenueBetween(
            @Param("branchId") Long branchId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT COUNT(b) FROM Bill b "
            + "WHERE (:branchId IS NULL OR b.branch.id = :branchId) "
            + "AND b.status = 'paid' "
            + "AND b.createdAt BETWEEN :startDate AND :endDate")
    Long countOrdersBetween(
            @Param("branchId") Long branchId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT b FROM Bill b "
            + "WHERE (:branchId IS NULL OR b.branch.id = :branchId) "
            + "AND b.status = 'paid' "
            + "AND b.createdAt BETWEEN :startDate AND :endDate "
            + "ORDER BY b.createdAt ASC")
    List<Bill> findPaidBillsBetween(
            @Param("branchId") Long branchId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}
