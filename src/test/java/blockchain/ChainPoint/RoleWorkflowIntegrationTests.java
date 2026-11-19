package blockchain.ChainPoint;

import blockchain.ChainPoint.entity.*;
import blockchain.ChainPoint.entity.enums.*;
import blockchain.ChainPoint.repository.*;
import blockchain.ChainPoint.security.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoleWorkflowIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired BranchRepository branches;
    @Autowired UserRepository users;
    @Autowired ProductRepository products;
    @Autowired DiningTableRepository tables;
    @Autowired BillRepository bills;
    @Autowired CustomerRepository customers;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtTokenProvider jwt;
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    blockchain.ChainPoint.service.BlockchainService chainService;
    @Autowired blockchain.ChainPoint.worker.BlockchainWorker worker;
    Branch a, b, c;
    User owner, manager, cashier;
    String ownerToken, managerToken, cashierToken;
    Product product;
    String suffix;

    @BeforeEach void seed() {
        suffix = UUID.randomUUID().toString().substring(0, 8);
        a = branch("A"); b = branch("B"); c = branch("C");
        owner = user("owner", RoleType.ROLE_OWNER, null);
        manager = user("manager", RoleType.ROLE_MANAGER, a);
        manager.setManagedBranches(new HashSet<>(Set.of(a, b))); users.save(manager);
        cashier = user("cashier", RoleType.ROLE_CASHIER, a);
        ownerToken = token(owner); managerToken = token(manager); cashierToken = token(cashier);
        product = products.save(Product.builder().code("P" + suffix).name("Coffee").category("drink")
                .price(new BigDecimal("100000")).stockQuantity(100).branch(a).build());
        table(a, "T1"); table(b, "T1"); table(c, "T1");
    }

    @Test void loginInvalidCredentialsAndJwtFailures() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(json.writeValueAsString(Map.of("username", cashier.getUsername(), "password", "Password123!"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("ROLE_CASHIER"))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly")));
        mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(json.writeValueAsString(Map.of("username", cashier.getUsername(), "password", "wrong"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/orders")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/orders").header("Authorization", "Bearer invalid.jwt.token")).andExpect(status().isUnauthorized());
        var expired = new JwtTokenProvider("chainpoint-test-only-signing-key-32-characters-minimum", -1000).generateToken(new CustomUserDetails(cashier));
        mvc.perform(get("/api/v1/orders").header("Authorization", "Bearer " + expired)).andExpect(status().isUnauthorized());
    }

    @Test void roleAndBranchBoundariesAndDirectPages() throws Exception {
        mvc.perform(auth(get("/api/v1/branches"), cashierToken)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(auth(get("/api/v1/branches"), managerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(auth(get("/api/v1/tables").param("branchId", c.getId().toString()), managerToken)).andExpect(status().isForbidden());
        mvc.perform(auth(get("/api/v1/admin/dashboard/metrics"), cashierToken)).andExpect(status().isForbidden());
        User staleClaims = User.builder().username(cashier.getUsername()).fullName("Stale claims").role(RoleType.ROLE_OWNER).build();
        mvc.perform(auth(get("/api/v1/admin/dashboard/metrics"), token(staleClaims))).andExpect(status().isForbidden());
        mvc.perform(get("/Frontend/pages/owner/dashboard.html")).andExpect(status().isUnauthorized());
        mvc.perform(get("/Frontend/pages/owner/dashboard.html").cookie(new jakarta.servlet.http.Cookie("cp_page", cashierToken))).andExpect(status().isForbidden());
        mvc.perform(get("/Frontend/pages/branch/dashboard.html").cookie(new jakarta.servlet.http.Cookie("cp_page", managerToken))).andExpect(status().isOk());
        mvc.perform(auth(get("/api/v1/orders").cookie(new jakarta.servlet.http.Cookie("cp_page", ownerToken)), "bad")).andExpect(status().isUnauthorized());
        mvc.perform(auth(get("/api/v1/branches/" + c.getId()), ownerToken)).andExpect(status().isOk());
        users.findById(cashier.getId()).ifPresent(u -> { u.setStatus("inactive"); users.save(u); });
        mvc.perform(auth(get("/api/v1/orders"), cashierToken)).andExpect(status().isUnauthorized());
    }

    @Test void ownerCreatesBranchAssignsManagerAndManagerCreatesCashier() throws Exception {
        String created = send(post("/api/v1/branches"), ownerToken, Map.of("code", "NEW" + suffix, "name", "New branch", "address", "HCM"), 201).get("id").asText();
        mvc.perform(auth(post("/api/v1/branches").contentType("application/json").content(json.writeValueAsString(Map.of("code", "DENY", "name", "Denied", "address", "HCM"))), managerToken)).andExpect(status().isForbidden());
        Map<String, Object> managerRequest = staff("newmanager", "ROLE_MANAGER", Long.valueOf(created));
        managerRequest.put("branchIds", List.of(Long.valueOf(created), b.getId()));
        JsonNode result = send(post("/api/v1/staff"), ownerToken, managerRequest, 201);
        assertEquals(2, result.get("branchIds").size());
        send(post("/api/v1/staff"), managerToken, staff("newcashier", "ROLE_CASHIER", b.getId()), 201);
        mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(json.writeValueAsString(Map.of("username", "newcashier" + suffix, "password", "Password123!"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("ROLE_CASHIER")).andExpect(jsonPath("$.branchId").value(b.getId()));
        send(post("/api/v1/staff"), managerToken, staff("escalate", "ROLE_OWNER", a.getId()), 403);
        send(post("/api/v1/staff"), managerToken, staff("foreign", "ROLE_CASHIER", c.getId()), 403);
        send(put("/api/v1/staff/" + owner.getId()), managerToken, staff("owner", "ROLE_CASHIER", a.getId()), 403);
        send(put("/api/v1/staff/" + cashier.getId()), ownerToken, staff("cashier", "ROLE_CASHIER", c.getId()), 200);
        mvc.perform(auth(get("/api/v1/tables").param("branchId", a.getId().toString()), cashierToken)).andExpect(status().isForbidden());
    }

    @Test void productsTablesCustomersAreScopedAndBalancesCannotBeForged() throws Exception {
        var req = Map.of("code", "D" + suffix, "name", "Dish", "category", "hot", "price", 50000, "stockQuantity", 10, "branchId", b.getId());
        JsonNode added = send(post("/api/v1/products"), managerToken, req, 201);
        mvc.perform(auth(get("/api/v1/products/" + added.get("id").asText()), cashierToken)).andExpect(status().isForbidden());
        send(put("/api/v1/products/" + added.get("id").asText()), cashierToken, req, 403);
        Product global = products.save(Product.builder().code("G" + suffix).name("Shared").category("hot").price(BigDecimal.ONE).stockQuantity(5).build());
        mvc.perform(auth(patch("/api/v1/products/" + global.getId() + "/toggle-status"), managerToken)).andExpect(status().isForbidden());
        send(post("/api/v1/tables"), managerToken, Map.of("code", "T2", "name", "Table 2", "area", "Main", "seats", 4, "branchId", b.getId()), 201);
        Long foreignTable = tables.findByCodeAndBranchId("T1", c.getId()).orElseThrow().getId();
        mvc.perform(auth(get("/api/v1/tables/" + foreignTable), managerToken)).andExpect(status().isForbidden());
        send(post("/api/v1/customers"), cashierToken, Map.of("name", "Customer", "phone", "090" + suffix, "branchId", a.getId(), "points", 100000), 400);
        send(put("/api/v1/loyalty/config"), managerToken, Map.of("pointValueVnd", 99999), 403);
    }

    @Test void cashOrderLoyaltyRevenueIdempotencyAndCancellation() throws Exception {
        Customer customer = customer(a);
        var request = order("cash", "T1");
        JsonNode open = send(post("/api/v1/pos/orders"), cashierToken, request, 200);
        String code = open.get("billCode").asText();
        assertEquals("open", open.get("status").asText());
        assertEquals(99, products.findById(product.getId()).orElseThrow().getStockQuantity());
        assertEquals(code, send(post("/api/v1/pos/orders"), cashierToken, request, 200).get("billCode").asText());
        request.put("orderCode", code); request.put("customerPhone", customer.getPhone()); request.put("pointsToUse", 5); request.put("cashReceived", 95000);
        request.put("cashReceived", 1);
        send(post("/api/v1/pos/checkout"), cashierToken, request, 400);
        assertEquals(100, customers.findById(customer.getId()).orElseThrow().getPoints());
        request.put("cashReceived", 95000);
        JsonNode paid = send(post("/api/v1/pos/checkout"), cashierToken, request, 200);
        assertEquals("paid", paid.get("status").asText());
        assertEquals(0, new BigDecimal("95000").compareTo(paid.get("finalAmount").decimalValue()));
        send(post("/api/v1/pos/checkout"), cashierToken, request, 200);
        Customer after = customers.findById(customer.getId()).orElseThrow();
        assertEquals(104, after.getPoints()); assertEquals(0, after.getTotalSpent().compareTo(new BigDecimal("95000")));
        JsonNode metrics = read("/api/v1/admin/dashboard/metrics?branchId=" + a.getId() + "&range=today", managerToken);
        assertEquals(0, metrics.get("totalRevenue").decimalValue().compareTo(new BigDecimal("95000")));
        assertEquals("active", tables.findByCodeAndBranchId("T1", a.getId()).orElseThrow().getStatus());
        JsonNode second = send(post("/api/v1/pos/orders"), cashierToken, order("cash", "T1"), 200);
        mvc.perform(auth(post("/api/v1/pos/orders/" + second.get("billCode").asText() + "/cancel"), cashierToken)).andExpect(status().isNoContent());
        assertEquals(99, products.findById(product.getId()).orElseThrow().getStockQuantity());
    }

    @Test void transferRequiresSignedExactReceiptAndCannotDoubleSettle() throws Exception {
        Customer customer = customer(a);
        var request = order("transfer", "T1"); request.put("customerPhone", customer.getPhone()); request.put("pointsToUse", 5);
        JsonNode pending = send(post("/api/v1/pos/checkout"), cashierToken, request, 200);
        String code = pending.get("billCode").asText(); assertEquals("pending", pending.get("status").asText());
        assertEquals(100, customers.findById(customer.getId()).orElseThrow().getPoints());
        assertEquals(0, read("/api/v1/admin/dashboard/metrics?branchId=" + a.getId() + "&range=today", managerToken).get("totalRevenue").decimalValue().signum());
        assertFalse(read("/api/v1/payment/status/" + code, cashierToken).get("paid").asBoolean());
        assertEquals(0, read("/api/v1/payment/vietqr-info?billCode=" + code + "&amount=1", cashierToken).get("amount").decimalValue().compareTo(new BigDecimal("95000")));
        mvc.perform(auth(get("/api/v1/payment/status/" + code), token(user("othercash", RoleType.ROLE_CASHIER, c)))).andExpect(status().isForbidden());
        mvc.perform(auth(post("/api/v1/payment/simulate").contentType("application/json").content("{}"), cashierToken)).andExpect(status().isNotFound());
        Map<String, Object> receipt = new LinkedHashMap<>(Map.of("billCode", code, "amount", 95000, "reference", "BANK-" + suffix, "timestamp", Instant.now().getEpochSecond()));
        sendSigned(receipt, "bad", 403);
        receipt.put("amount", 1); sendSigned(receipt, signature(receipt), 400);
        receipt.put("amount", 95000); sendSigned(receipt, signature(receipt), 200); sendSigned(receipt, signature(receipt), 200);
        assertTrue(read("/api/v1/payment/status/" + code, cashierToken).get("paid").asBoolean());
        assertEquals(104, customers.findById(customer.getId()).orElseThrow().getPoints());
        receipt.put("timestamp", Instant.now().getEpochSecond() - 1000); sendSigned(receipt, signature(receipt), 403);
        send(post("/api/v1/orders/" + code + "/refund"), managerToken, Map.of("reason", "Correction"), 200);
        assertEquals(100, customers.findById(customer.getId()).orElseThrow().getPoints());
        assertEquals(100, products.findById(product.getId()).orElseThrow().getStockQuantity());
        send(post("/api/v1/orders/" + code + "/refund"), managerToken, Map.of(), 400);
    }

    @Test void legacyRolesReadCanonicallyAndUnknownRolesFailClosed() {
        RoleTypeConverter converter = new RoleTypeConverter();
        assertEquals(RoleType.ROLE_OWNER, converter.convertToEntityAttribute("ROLE_ADMIN"));
        assertEquals(RoleType.ROLE_MANAGER, converter.convertToEntityAttribute("Branch"));
        assertEquals(RoleType.ROLE_CASHIER, converter.convertToEntityAttribute("EMPLOYEE"));
        assertEquals("ROLE_CASHIER", converter.convertToDatabaseColumn(converter.convertToEntityAttribute("POS")));
        assertThrows(IllegalArgumentException.class, () -> converter.convertToEntityAttribute("SUPERUSER"));
    }

    @Test void openOrderCorrectionsPersistNotesAndRollbackInvalidStock() throws Exception {
        var request = order("cash", "T1");
        String code = send(post("/api/v1/pos/orders"), cashierToken, request, 200).get("billCode").asText();
        request.put("orderCode", code);
        request.put("items", List.of(Map.of("productId", product.getId(), "quantity", 3, "note", "Less ice")));
        send(post("/api/v1/pos/orders"), cashierToken, request, 200);
        assertEquals(97, products.findById(product.getId()).orElseThrow().getStockQuantity());
        assertEquals("Less ice", read("/api/v1/orders/" + code, cashierToken).get("items").get(0).get("note").asText());
        request.put("items", List.of(Map.of("productId", product.getId(), "quantity", 1000)));
        send(post("/api/v1/pos/orders"), cashierToken, request, 409);
        assertEquals(97, products.findById(product.getId()).orElseThrow().getStockQuantity());
        assertEquals(3, read("/api/v1/orders/" + code, cashierToken).get("items").get(0).get("quantity").asInt());
        send(post("/api/v1/pos/orders"), token(user("foreign", RoleType.ROLE_CASHIER, c)), request, 403);
        Product disabled = products.findById(product.getId()).orElseThrow(); disabled.setStatus("out_of_stock"); products.save(disabled);
        mvc.perform(auth(post("/api/v1/pos/orders/" + code + "/cancel"), cashierToken)).andExpect(status().isNoContent());
        assertEquals(100, products.findById(product.getId()).orElseThrow().getStockQuantity());
        assertEquals("out_of_stock", products.findById(product.getId()).orElseThrow().getStatus());
    }

    @Test void simultaneousCashRequestsSettleExactlyOnce() throws Exception {
        Customer customer = customer(a);
        var request = order("cash", "T1");
        String code = send(post("/api/v1/pos/orders"), cashierToken, request, 200).get("billCode").asText();
        request.put("orderCode", code); request.put("customerPhone", customer.getPhone()); request.put("cashReceived", 100000);
        String body = json.writeValueAsString(request);
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        var gate = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.Callable<Integer> task = () -> {
            gate.await();
            return mvc.perform(auth(post("/api/v1/pos/checkout").contentType("application/json").content(body), cashierToken)).andReturn().getResponse().getStatus();
        };
        try {
            var first = executor.submit(task); var second = executor.submit(task); gate.countDown();
            assertEquals(200, first.get(15, java.util.concurrent.TimeUnit.SECONDS));
            assertEquals(200, second.get(15, java.util.concurrent.TimeUnit.SECONDS));
        } finally { executor.shutdownNow(); }
        assertEquals(110, customers.findById(customer.getId()).orElseThrow().getPoints());
        assertEquals(0, customers.findById(customer.getId()).orElseThrow().getTotalSpent().compareTo(new BigDecimal("100000")));
        assertEquals(99, products.findById(product.getId()).orElseThrow().getStockQuantity());
        assertNotNull(bills.findByBillCode(code).orElseThrow().getPaidAt());
        String today = java.time.LocalDate.now().toString();
        assertEquals(1, read("/api/v1/admin/dashboard/metrics?branchId=" + a.getId() + "&from=" + today + "&to=" + today, ownerToken).get("totalOrders").asInt());
    }

    @Test void productAndTableCrudAndValidation() throws Exception {
        Map<String, Object> request = new LinkedHashMap<>(Map.of("code", "EDIT" + suffix, "name", "Initial", "category", "new-category", "price", 15000, "stockQuantity", 5, "branchId", b.getId()));
        String id = send(post("/api/v1/products"), managerToken, request, 201).get("id").asText();
        request.put("name", "Updated"); request.put("price", 20000);
        assertEquals("Updated", send(put("/api/v1/products/" + id), managerToken, request, 200).get("name").asText());
        mvc.perform(auth(patch("/api/v1/products/" + id + "/toggle-status"), managerToken)).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("out_of_stock"));
        mvc.perform(auth(delete("/api/v1/products/" + id), managerToken)).andExpect(status().isNoContent());
        var tableRequest = new LinkedHashMap<String, Object>(Map.of("code", "EDIT", "name", "Initial", "area", "Outside", "seats", 4, "branchId", b.getId()));
        String tableId = send(post("/api/v1/tables"), managerToken, tableRequest, 201).get("id").asText();
        tableRequest.put("name", "Updated");
        send(put("/api/v1/tables/" + tableId), managerToken, tableRequest, 200);
        mvc.perform(auth(delete("/api/v1/tables/" + tableId), managerToken)).andExpect(status().isNoContent());
        assertEquals("disabled", tables.findById(Long.valueOf(tableId)).orElseThrow().getStatus());
        send(put("/api/v1/loyalty/config"), ownerToken, Map.of("maxDiscountPercent", 101), 400);
        send(post("/api/v1/auth/register"), ownerToken, Map.of("fullName", "Unauthorized Owner", "phone", "0901234567", "password", "Password123!", "restaurantName", "Other", "province", "HCM"), 403);
    }

    @Test void blockchainRetryKeepsCompletedCheckpointsAndIgnoresDuplicateDelivery() throws Exception {
        Customer customer = customer(a);
        var request = order("cash", "T1"); request.put("customerPhone", customer.getPhone()); request.put("pointsToUse", 5); request.put("cashReceived", 95000);
        String code = send(post("/api/v1/pos/checkout"), cashierToken, request, 200).get("billCode").asText();
        String invoiceHash = "0x" + "a".repeat(64), redeemHash = "0x" + "b".repeat(64), earnHash = "0x" + "c".repeat(64);
        org.mockito.Mockito.when(chainService.recordInvoice(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString())).thenReturn(invoiceHash);
        org.mockito.Mockito.when(chainService.redeemPoints(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any())).thenReturn(redeemHash);
        org.mockito.Mockito.when(chainService.earnPoints(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any()))
                .thenThrow(new IllegalStateException("Test RPC unavailable")).thenReturn(earnHash);
        var event = blockchain.ChainPoint.event.CheckoutWeb3Event.builder().billCode(code).branchId(a.getId()).customerPhone(customer.getPhone()).pointsUsed(5L).pointsEarned(9L).finalAmount(new BigDecimal("95000")).discountAmount(new BigDecimal("5000")).billHash("hash").build();
        assertThrows(org.springframework.amqp.AmqpRejectAndDontRequeueException.class, () -> worker.handleCheckoutEvent(event));
        Bill partial = bills.findByBillCode(code).orElseThrow();
        assertEquals(invoiceHash, partial.getBlockchainTxHash()); assertEquals(redeemHash, partial.getRedeemTxHash()); assertTrue(partial.getBlockchainPending());
        worker.handleCheckoutEvent(event); worker.handleCheckoutEvent(event);
        assertFalse(bills.findByBillCode(code).orElseThrow().getBlockchainPending());
        org.mockito.Mockito.verify(chainService, org.mockito.Mockito.times(1)).recordInvoice(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString());
        org.mockito.Mockito.verify(chainService, org.mockito.Mockito.times(1)).redeemPoints(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any());
    }

    @Test void normalizedPhoneLookupAndDuplicateRegistration() throws Exception {
        var payload = Map.of("name", "Phone Member", "phone", "+84 908-123-456", "branchId", a.getId());
        JsonNode created = send(post("/api/v1/customers"), cashierToken, payload, 201);
        assertEquals("0908123456", created.get("phone").asText());
        assertEquals(created.get("id"), read("/api/v1/customers/by-phone/0908123456", cashierToken).get("id"));
        send(post("/api/v1/customers"), cashierToken, Map.of("name", "Duplicate", "phone", "0908.123.456", "branchId", a.getId()), 409);
        mvc.perform(auth(get("/api/v1/customers/by-phone/invalid"), cashierToken)).andExpect(status().isBadRequest());
        mvc.perform(auth(get("/api/v1/customers/by-phone/0908999999"), cashierToken)).andExpect(status().isNotFound());
    }

    @Test void pendingRedemptionReservesWithoutDeductingAndCancellationReleases() throws Exception {
        Customer member = customer(a);
        var request = order("transfer", "T1"); request.put("customerPhone", member.getPhone()); request.put("pointsToUse", 40);
        member.setPoints(10L); customers.save(member); request.put("pointsToUse", 20);
        send(post("/api/v1/pos/checkout"), cashierToken, request, 400);
        assertEquals(10, customers.findById(member.getId()).orElseThrow().getPoints());
        member.setPoints(100L); customers.save(member); request.put("pointsToUse", 40);
        String code = send(post("/api/v1/pos/checkout"), cashierToken, request, 200).get("billCode").asText();
        assertEquals(100, customers.findById(member.getId()).orElseThrow().getPoints());
        assertEquals(60, read("/api/v1/customers/by-phone/" + member.getPhone(), cashierToken).get("availablePoints").asInt());
        mvc.perform(auth(post("/api/v1/pos/orders/" + code + "/cancel"), managerToken)).andExpect(status().isNoContent());
        assertEquals(100, read("/api/v1/customers/by-phone/" + member.getPhone(), cashierToken).get("availablePoints").asInt());
        assertEquals(100, customers.findById(member.getId()).orElseThrow().getPoints());
    }

    @Test void concurrentOrdersForSameCustomerDoNotLoseLoyaltyUpdates() throws Exception {
        Customer member = customer(a); table(a, "T2");
        var first = order("cash", "T1"); var second = order("cash", "T2");
        for (var request : List.of(first, second)) {
            request.put("orderCode", send(post("/api/v1/pos/orders"), cashierToken, request, 200).get("billCode").asText());
            request.put("customerPhone", member.getPhone()); request.put("pointsToUse", 40); request.put("cashReceived", 60000);
        }
        var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        var gate = new java.util.concurrent.CountDownLatch(1);
        try {
            var jobs = new java.util.ArrayList<java.util.concurrent.Future<?>>();
            for (var request : List.of(first, second)) jobs.add(executor.submit(() -> {
                try { gate.await(); send(post("/api/v1/pos/checkout"), cashierToken, request, 200); }
                catch (Exception exception) { throw new RuntimeException(exception); }
            }));
            gate.countDown();
            for (var job : jobs) job.get(20, java.util.concurrent.TimeUnit.SECONDS);
        } finally { executor.shutdownNow(); }
        assertEquals(32, customers.findById(member.getId()).orElseThrow().getPoints());
        assertEquals(0, customers.findById(member.getId()).orElseThrow().getTotalSpent().compareTo(new BigDecimal("120000")));
    }

    Branch branch(String code) { return branches.save(Branch.builder().code(code + suffix).name(code).address("HCM").build()); }
    void table(Branch branch, String code) { tables.save(DiningTable.builder().code(code).seats(4).branch(branch).build()); }
    User user(String name, RoleType role, Branch branch) { return users.save(User.builder().username(name + suffix).fullName(name).password(passwords.encode("Password123!")).role(role).branch(branch).build()); }
    String token(User user) { return jwt.generateToken(new CustomUserDetails(user)); }
    Customer customer(Branch branch) { return customers.save(Customer.builder().code("KH" + suffix).name("Customer").phone("09" + String.format("%08d", Integer.toUnsignedLong(suffix.hashCode()) % 100000000)).points(100L).branch(branch).build()); }
    Map<String, Object> staff(String name, String role, Long branch) { return new LinkedHashMap<>(Map.of("username", name + suffix, "fullName", name, "password", "Password123!", "role", role, "branchId", branch)); }
    Map<String, Object> order(String method, String table) { return new LinkedHashMap<>(Map.of("requestKey", UUID.randomUUID().toString(), "branchId", a.getId(), "tableCode", table, "paymentMethod", method, "items", List.of(Map.of("productId", product.getId(), "quantity", 1, "note", "No sugar")))); }
    MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request, String token) { return request.header("Authorization", "Bearer " + token); }
    JsonNode send(MockHttpServletRequestBuilder request, String token, Object body, int status) throws Exception { var result = mvc.perform(auth(request.contentType("application/json").content(json.writeValueAsString(body)), token)).andExpect(status().is(status)).andReturn(); return json.readTree(result.getResponse().getContentAsString()); }
    JsonNode read(String path, String token) throws Exception { return json.readTree(mvc.perform(auth(get(path), token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()); }
    void sendSigned(Map<String, Object> body, String signature, int expected) throws Exception { mvc.perform(post("/api/v1/payment/provider-confirmation").contentType("application/json").header("X-Payment-Signature", signature).content(json.writeValueAsString(body))).andExpect(status().is(expected)); }
    String signature(Map<String, Object> body) throws Exception { Mac mac = Mac.getInstance("HmacSHA256"); mac.init(new SecretKeySpec("chainpoint-test-only-webhook-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256")); return HexFormat.of().formatHex(mac.doFinal((body.get("billCode") + "\n" + body.get("amount") + "\n" + body.get("reference") + "\n" + body.get("timestamp")).getBytes(StandardCharsets.UTF_8))); }
}
