package blockchain.ChainPoint;

import blockchain.ChainPoint.entity.*;
import blockchain.ChainPoint.entity.enums.RoleType;
import blockchain.ChainPoint.repository.*;
import blockchain.ChainPoint.security.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class BusinessFlowTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired BranchRepository branches;
    @Autowired UserRepository users;
    @Autowired DiningTableRepository tables;
    @Autowired ProductRepository products;
    @Autowired CustomerRepository customers;
    @Autowired BillRepository bills;
    @Autowired CheckoutOutboxRepository outbox;
    @Autowired JwtTokenProvider tokens;
    Branch branch;
    Product product;
    String token;

    @BeforeEach void setup() {
        branch = branches.saveAndFlush(Branch.builder().code("TEST").name("Test branch").address("Test").build());
        var user = users.saveAndFlush(User.builder().username("cashier").password("unused")
                .fullName("Cashier").role(RoleType.ROLE_CASHIER).branch(branch).build());
        token = tokens.generateToken(new CustomUserDetails(user));
        tables.saveAndFlush(DiningTable.builder().branch(branch).code("T1").name("Table 1")
                .area("A").seats(4).status("busy").build());
        product = products.saveAndFlush(Product.builder().code("P1").name("Dish").category("hot")
                .emoji("X").price(new BigDecimal("100000")).stockQuantity(3).build());
    }

    String checkout(String phone, long points, int quantity, String reference) throws Exception {
        return json.writeValueAsString(Map.of("branchId", branch.getId(), "tableCode", "T1",
                "paymentMethod", "cash", "cashierUsername", "forged-owner", "customerPhone", phone,
                "pointsToUse", points, "checkoutReference", reference,
                "items", new Object[]{Map.of("productId", product.getId(), "quantity", quantity)}));
    }

    JsonNode pay(String body) throws Exception {
        var result = mvc.perform(post("/api/v1/pos/checkout").header("Authorization", "Bearer " + token)
                .contentType("application/json").content(body)).andExpect(status().isOk()).andReturn();
        return json.readTree(result.getResponse().getContentAsString());
    }

    @Test void staticPagesArePublicAndApisRequireJwt() throws Exception {
        for (String path : new String[]{"/", "/Frontend/index.html", "/pos/index.html", "/Frontend/js/common/api.js", "/pos/css/base.css"}) {
            mvc.perform(get(path)).andExpect(status().isOk());
        }
        mvc.perform(get("/api/v1/products")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/products").header("Authorization", "Bearer invalid")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/products").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(get("/Frontend/pos/payment.html?bill=HD1"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/pos/payment.html?bill=HD1"));
    }

    @Test void walkInCheckoutUsesAuthenticatedCashierAndDoesNotEarnPoints() throws Exception {
        var paid = pay(checkout("", 0, 3, "walk-in"));
        assertThat(paid.get("pointsEarned").asLong()).isZero();
        var bill = bills.findByBillCode(paid.get("billCode").asText()).orElseThrow();
        assertThat(bill.getCashierUsername()).isEqualTo("cashier");
        assertThat(products.findById(product.getId()).orElseThrow().getStatus()).isEqualTo("out_of_stock");
        assertThat(tables.findByCodeAndBranchId("T1", branch.getId()).orElseThrow().getStatus()).isEqualTo("available");
        assertThat(outbox.count()).isEqualTo(1);
        assertThat(bill.getDetails()).hasSize(1);
    }

    @Test void checkoutRetryReturnsSameBillWithoutDeductingStockTwice() throws Exception {
        var body = checkout("", 0, 1, "retry");
        var first = pay(body);
        var second = pay(body);
        assertThat(second.get("billCode")).isEqualTo(first.get("billCode"));
        assertThat(products.findById(product.getId()).orElseThrow().getStockQuantity()).isEqualTo(2);
        assertThat(bills.count()).isEqualTo(1);
        assertThat(outbox.count()).isEqualTo(1);
    }

    @Test void registeredCustomerRedeemsAndEarnsAccordingToDatabaseRules() throws Exception {
        customers.saveAndFlush(Customer.builder().code("C1").name("Customer").phone("0900000000")
                .points(20L).branch(branch).build());
        var result = pay(checkout("0900000000", 5, 1, "loyalty"));
        assertThat(result.get("finalAmount").decimalValue()).isEqualByComparingTo("95000");
        assertThat(result.get("pointsEarned").asLong()).isEqualTo(9);
        assertThat(customers.findByPhone("0900000000").orElseThrow().getPoints()).isEqualTo(24);
    }

    @Test void insufficientStockAndAnonymousRedemptionAreRejected() throws Exception {
        mvc.perform(post("/api/v1/pos/checkout").header("Authorization", "Bearer " + token)
                .contentType("application/json").content(checkout("", 0, 4, "stock")))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/v1/pos/checkout").header("Authorization", "Bearer " + token)
                .contentType("application/json").content(checkout("", 5, 1, "points")))
                .andExpect(status().isBadRequest());
    }

    @Test void cashierCannotCreateStaffOrModifyProductsOrAccessOtherBranches() throws Exception {
        mvc.perform(get("/api/v1/staff").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/products/" + product.getId()).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/orders?branchId=999").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        assertThat(tables.countBusyTables(branch.getId())).isEqualTo(1);
    }
}
