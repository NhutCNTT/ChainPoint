package blockchain.ChainPoint.repository;

import blockchain.ChainPoint.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByPhone(String phone);

    @Query("SELECT COUNT(c) FROM Customer c "
            + "WHERE (:branchId IS NULL OR c.branch.id = :branchId)")
    Long countTotalCustomers(@Param("branchId") Long branchId);

    @Query("SELECT COUNT(c) FROM Customer c "
            + "WHERE (:branchId IS NULL OR c.branch.id = :branchId) "
            + "AND c.createdAt BETWEEN :startDate AND :endDate")
    Long countNewCustomersBetween(
            @Param("branchId") Long branchId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}
