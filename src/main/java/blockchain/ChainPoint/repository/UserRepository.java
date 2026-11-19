package blockchain.ChainPoint.repository;

import blockchain.ChainPoint.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @EntityGraph(attributePaths = {"branch", "managedBranches"})
    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    @EntityGraph(attributePaths = "branch")
    List<User> findAllByOrderByIdAsc();

    @EntityGraph(attributePaths = "branch")
    List<User> findByBranchIdOrderByIdAsc(Long branchId);

    long countByBranchId(Long branchId);

    long countByRole(blockchain.ChainPoint.entity.enums.RoleType role);

    @EntityGraph(attributePaths = {"branch", "managedBranches"})
    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE u.role = blockchain.ChainPoint.entity.enums.RoleType.ROLE_CASHIER AND u.branch.id IN :ids ORDER BY u.id")
    List<User> findCashiersInBranches(@org.springframework.data.repository.query.Param("ids") java.util.Set<Long> ids);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(DISTINCT u.id) FROM User u LEFT JOIN u.managedBranches mb WHERE u.role <> blockchain.ChainPoint.entity.enums.RoleType.ROLE_OWNER AND (:branchId IS NULL OR u.branch.id = :branchId OR mb.id = :branchId)")
    long countStaffInBranch(@org.springframework.data.repository.query.Param("branchId") Long branchId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT u FROM User u LEFT JOIN u.managedBranches mb WHERE u.role = blockchain.ChainPoint.entity.enums.RoleType.ROLE_MANAGER AND u.status = 'active' AND (u.branch.id = :branchId OR mb.id = :branchId) ORDER BY u.id")
    List<User> findManagersForBranch(@org.springframework.data.repository.query.Param("branchId") Long branchId);
}
