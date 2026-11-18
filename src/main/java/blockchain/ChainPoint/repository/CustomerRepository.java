package blockchain.ChainPoint.repository;

import blockchain.ChainPoint.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    @Query("SELECT c FROM Customer c WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '.', ''), '(', ''), ')', '') IN :phones")
    List<Customer> findPhoneVariants(@Param("phones") List<String> phones);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Customer c WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '.', ''), '(', ''), ')', '') IN :phones")
    List<Customer> findPhoneVariantsForUpdate(@Param("phones") List<String> phones);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Customer c WHERE c.phone = :phone")
    Optional<Customer> findByPhoneForUpdate(@Param("phone") String phone);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Customer c WHERE c.id = :id")
    Optional<Customer> findByIdForUpdate(@Param("id") Long id);

    Optional<Customer> findByPhone(String phone);

    boolean existsByPhone(String phone);

    boolean existsByCode(String code);

    List<Customer> findByBranchId(Long branchId);

    List<Customer> findAllByOrderByCreatedAtDesc();

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
