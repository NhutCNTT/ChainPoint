package blockchain.ChainPoint;

import blockchain.ChainPoint.entity.*;
import blockchain.ChainPoint.entity.enums.RoleType;
import blockchain.ChainPoint.repository.*;
import org.springframework.boot.SpringApplication;
import org.springframework.context.annotation.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.util.Set;

/** Explicitly launched test-only server. Never packaged into the production application. */
public class BrowserTestApplication {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(ChainPointApplication.class, Fixtures.class);
        app.setAdditionalProfiles("test", "browser-fixtures");
        app.run(args);
    }
    @Configuration
    @Profile("browser-fixtures")
    static class Fixtures {
        @Bean CommandLineRunner browserFixtures(BranchRepository branches, UserRepository users, ProductRepository products,
                                               DiningTableRepository tables, PasswordEncoder passwords) {
            return args -> {
                Branch a = branches.save(Branch.builder().code("BROWSER-A").name("Browser branch A").address("Test address A").build());
                Branch b = branches.save(Branch.builder().code("BROWSER-B").name("Browser branch B").address("Test address B").build());
                for (RoleType role : RoleType.values()) {
                    User user = User.builder().username(role.name().substring(5).toLowerCase()).fullName(role.name())
                            .password(passwords.encode("BrowserTest123!" )).role(role).branch(role == RoleType.ROLE_OWNER ? null : a).build();
                    if (role == RoleType.ROLE_MANAGER) user.getManagedBranches().addAll(Set.of(a, b));
                    users.save(user);
                }
                String fixturePassword = passwords.encode("BrowserTest123!");
                for (int index = 0; index < 24; index++) {
                    users.save(User.builder().username("fixturecashier" + index).fullName("Fixture cashier " + index)
                            .password(fixturePassword).role(RoleType.ROLE_CASHIER).branch(a).build());
                }
                products.save(Product.builder().code("TEST-COFFEE").name("Test Coffee").category("drink").price(new BigDecimal("30000")).branch(a).stockQuantity(100).build());
                tables.save(DiningTable.builder().code("T1").name("Test table 1").area("Main").seats(4).branch(a).build());
                tables.save(DiningTable.builder().code("T2").name("Test table 2").area("Main").seats(4).branch(b).build());
                System.out.println("CHAINPOINT_BROWSER_FIXTURES_READY");
            };
        }
    }
}
