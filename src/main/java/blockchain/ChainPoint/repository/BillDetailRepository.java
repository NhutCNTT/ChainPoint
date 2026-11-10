package blockchain.ChainPoint.repository;

import blockchain.ChainPoint.entity.BillDetail;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BillDetailRepository extends JpaRepository<BillDetail, Long> {

    @Query("SELECT d.productName, SUM(d.quantity), SUM(d.subtotal) "
            + "FROM BillDetail d "
            + "WHERE (:branchId IS NULL OR d.bill.branch.id = :branchId) "
            + "AND d.bill.status = 'paid' "
            + "GROUP BY d.productName "
            + "ORDER BY SUM(d.quantity) DESC")
    List<Object[]> findTopSellingDishes(@Param("branchId") Long branchId, Pageable pageable);
}
