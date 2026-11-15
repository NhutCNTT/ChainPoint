package blockchain.ChainPoint.repository;

import blockchain.ChainPoint.entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AreaRepository extends JpaRepository<Area, Long> {
    List<Area> findByBranchIdOrderByDisplayOrderAsc(Long branchId);
    Optional<Area> findByBranchIdAndCode(Long branchId, String code);
}
