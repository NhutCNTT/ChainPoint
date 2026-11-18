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

    Optional<DiningTable> findByCodeAndBranchId(String code, Long branchId);

    List<DiningTable> findByBranchId(Long branchId);

    List<DiningTable> findByBranchIdAndArea(Long branchId, String area);

    List<DiningTable> findByStatus(String status);

    @Query("SELECT COUNT(t) FROM DiningTable t "
            + "WHERE (:branchId IS NULL OR t.branch.id = :branchId) "
            + "AND t.status = 'busy'")
    Long countBusyTables(@Param("branchId") Long branchId);
}
