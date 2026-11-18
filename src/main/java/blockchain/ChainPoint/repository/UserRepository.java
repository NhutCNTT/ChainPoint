package blockchain.ChainPoint.repository;

import blockchain.ChainPoint.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @EntityGraph(attributePaths = "branch")
    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);
}
