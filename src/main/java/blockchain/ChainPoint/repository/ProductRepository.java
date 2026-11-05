package blockchain.ChainPoint.repository;

import blockchain.ChainPoint.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByCode(String code);

    boolean existsByCode(String code);

    List<Product> findByCategoryIgnoreCase(String category);

    List<Product> findByStatus(String status);
}
