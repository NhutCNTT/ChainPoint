package blockchain.ChainPoint.repository;

import blockchain.ChainPoint.entity.DiningTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM DiningTable t WHERE t.code = :code AND t.branch.id = :branchId")
    Optional<DiningTable> findForUpdate(@Param("code") String code, @Param("branchId") Long branchId);

    Optional<DiningTable> findByCodeAndBranchId(String code, Long branchId);

    List<DiningTable> findByBranchId(Long branchId);

    List<DiningTable> findByBranchIdAndArea(Long branchId, String area);

    List<DiningTable> findByStatus(String status);

    long countByBranchId(Long branchId);

    @Query("SELECT COUNT(t) FROM DiningTable t "
            + "WHERE (:branchId IS NULL OR t.branch.id = :branchId) "
            + "AND lower(t.status) IN ('busy', 'occupied', 'in_use', 'pending')")
    Long countBusyTables(@Param("branchId") Long branchId);
}
