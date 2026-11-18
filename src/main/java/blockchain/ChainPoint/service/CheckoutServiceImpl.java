package blockchain.ChainPoint.service;

import blockchain.ChainPoint.config.RabbitMQConfig;
import blockchain.ChainPoint.dto.pos.CheckoutItemRequest;
import blockchain.ChainPoint.dto.pos.CheckoutRequest;
import blockchain.ChainPoint.dto.pos.CheckoutResponse;
import blockchain.ChainPoint.entity.Branch;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.entity.BillDetail;
import blockchain.ChainPoint.entity.Customer;
import blockchain.ChainPoint.entity.DiningTable;
import blockchain.ChainPoint.entity.LoyaltyConfig;
import blockchain.ChainPoint.entity.LoyaltyTransaction;
import blockchain.ChainPoint.entity.Product;
import blockchain.ChainPoint.event.CheckoutWeb3Event;
import blockchain.ChainPoint.exception.InsufficientStockException;
import blockchain.ChainPoint.exception.InvalidRedemptionException;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.repository.BranchRepository;
import blockchain.ChainPoint.repository.CustomerRepository;
import blockchain.ChainPoint.repository.DiningTableRepository;
import blockchain.ChainPoint.repository.LoyaltyConfigRepository;
import blockchain.ChainPoint.repository.LoyaltyTransactionRepository;
import blockchain.ChainPoint.repository.ProductRepository;
import blockchain.ChainPoint.security.CustomUserDetails;
import blockchain.ChainPoint.util.HashUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class CheckoutServiceImpl implements CheckoutService {

    private static final long DEFAULT_EARN_RATIO_VND = 10_000L;
    private static final long DEFAULT_POINT_VALUE_VND = 1_000L;
    private static final long DEFAULT_MIN_POINTS_TO_REDEEM = 5L;
    private static final int DEFAULT_MAX_DISCOUNT_PERCENT = 50;
    private static final long LOYALTY_CONFIG_ID = 1L;
    private static final String BILL_STATUS_PAID = "paid";
    private static final String TX_TYPE_REDEEM = "REDEEM";
    private static final String TX_TYPE_EARN = "EARN";
    private static final String ROLE_MANAGER = "ROLE_MANAGER";
    private static final String ROLE_CASHIER = "ROLE_CASHIER";
    private static final String TABLE_STATUS_DISABLED = "disabled";
    private static final String PRODUCT_STATUS_OUT_OF_STOCK = "out_of_stock";
    private static final String TIER_SILVER = "Bạc";
    private static final String TIER_GOLD = "Vàng";
    private static final String TIER_DIAMOND = "Kim Cương";
    private static final BigDecimal GOLD_TIER_THRESHOLD = new BigDecimal("5000000");
    private static final BigDecimal DIAMOND_TIER_THRESHOLD = new BigDecimal("20000000");

    private final BranchRepository branchRepository;
    private final DiningTableRepository diningTableRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final BillRepository billRepository;
    private final LoyaltyConfigRepository loyaltyConfigRepository;
    private final LoyaltyTransactionRepository loyaltyTransactionRepository;
    private final RabbitTemplate rabbitTemplate;

    @Override
    @Transactional(rollbackFor = Exception.class)
    @CacheEvict(value = "products", allEntries = true)
    public CheckoutResponse processCheckout(CheckoutRequest request) {
        String idempotencyKey = StringUtils.hasText(request.getIdempotencyKey())
                ? request.getIdempotencyKey().trim()
                : null;

        if (idempotencyKey != null) {
            Bill existingBill = billRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
            if (existingBill != null) {
                Customer existingCustomer = StringUtils.hasText(existingBill.getCustomerPhone())
                        ? customerRepository.findByPhone(existingBill.getCustomerPhone()).orElse(null)
                        : null;
                return toResponse(existingBill, existingCustomer);
            }
        }

        Branch branch = resolveBranch(request.getBranchId());
        validateTable(request.getTableCode(), branch.getId());

        Map<Long, Integer> quantitiesByProduct = aggregateQuantities(request.getItems());
        List<OrderLine> orderLines = new ArrayList<>();
        BigDecimal grossAmount = BigDecimal.ZERO;

        List<Long> productIds = new ArrayList<>(quantitiesByProduct.keySet());
        productIds.sort(Long::compareTo);

        for (Long productId : productIds) {
            int quantity = quantitiesByProduct.get(productId);
            Product product = productRepository.findByIdForUpdate(productId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product not found with id: " + productId
                    ));

            int availableStock = product.getStockQuantity() != null
                    ? product.getStockQuantity()
                    : 0;

            if (availableStock < quantity) {
                throw new InsufficientStockException(
                        "Insufficient stock for product " + product.getCode()
                                + ": requested " + quantity
                                + ", available " + availableStock
                );
            }

            product.setStockQuantity(availableStock - quantity);
            if (availableStock - quantity <= 0) {
                product.setStatus(PRODUCT_STATUS_OUT_OF_STOCK);
            }

            BigDecimal subtotal = product.getPrice()
                    .multiply(BigDecimal.valueOf(quantity))
                    .setScale(2, RoundingMode.HALF_UP);

            grossAmount = grossAmount.add(subtotal);
            orderLines.add(new OrderLine(product, quantity, subtotal));
        }

        grossAmount = grossAmount.setScale(2, RoundingMode.HALF_UP);

        String customerPhone = StringUtils.hasText(request.getCustomerPhone())
                ? request.getCustomerPhone().trim()
                : null;

        Customer customer = customerPhone != null
                ? customerRepository.findByPhone(customerPhone).orElse(null)
                : null;
        if (customer != null) {
            customer = customerRepository.findByIdForUpdate(customer.getId()).orElse(customer);
        }

        String billCode = "HD" + System.currentTimeMillis();
        LocalDateTime checkoutTime = LocalDateTime.now();

        LoyaltyConfig loyaltyConfig = loadLoyaltyConfig();
        long pointValueVnd = positiveOrDefault(
                loyaltyConfig.getPointValueVnd(),
                DEFAULT_POINT_VALUE_VND
        );
        long earnRatioVnd = positiveOrDefault(
                loyaltyConfig.getEarnRatioVnd(),
                DEFAULT_EARN_RATIO_VND
        );
        long minPointsToRedeem = positiveOrDefault(
                loyaltyConfig.getMinPointsToRedeem(),
                DEFAULT_MIN_POINTS_TO_REDEEM
        );
        int maxDiscountPercent = loyaltyConfig.getMaxDiscountPercent() != null
                ? loyaltyConfig.getMaxDiscountPercent()
                : DEFAULT_MAX_DISCOUNT_PERCENT;
        boolean allowEarn = loyaltyConfig.getAllowEarn() == null || loyaltyConfig.getAllowEarn();
        boolean allowRedeem = loyaltyConfig.getAllowRedeem() == null || loyaltyConfig.getAllowRedeem();

        long pointsToUse = request.getPointsToUse() != null ? request.getPointsToUse() : 0L;
        if (pointsToUse < 0) {
            throw new InvalidRedemptionException("Points to use cannot be negative");
        }

        BigDecimal discountAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (pointsToUse > 0) {
            if (!allowRedeem) {
                throw new InvalidRedemptionException(
                        "Loyalty point redemption is currently disabled"
                );
            }

            if (customer == null) {
                throw new InvalidRedemptionException(
                        "A registered customer is required to redeem loyalty points"
                );
            }

            if (pointsToUse < minPointsToRedeem) {
                throw new InvalidRedemptionException(
                        "Minimum points to redeem is " + minPointsToRedeem
                );
            }

            long currentPoints = customer.getPoints() != null ? customer.getPoints() : 0L;
            if (currentPoints < pointsToUse) {
                throw new InvalidRedemptionException(
                        "Insufficient loyalty points: requested " + pointsToUse
                                + ", available " + currentPoints
                );
            }

            discountAmount = BigDecimal.valueOf(pointsToUse)
                    .multiply(BigDecimal.valueOf(pointValueVnd))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal maxDiscount = grossAmount
                    .multiply(BigDecimal.valueOf(maxDiscountPercent))
                    .divide(BigDecimal.valueOf(100L), 2, RoundingMode.HALF_UP);
            if (discountAmount.compareTo(maxDiscount) > 0) {
                throw new InvalidRedemptionException(
                        "Discount cannot exceed " + maxDiscountPercent
                                + "% of the gross amount"
                );
            }
        }

        BigDecimal finalAmount = grossAmount
                .subtract(discountAmount)
                .setScale(2, RoundingMode.HALF_UP);

        long pointsEarned = allowEarn && customer != null
                ? finalAmount.divideToIntegralValue(BigDecimal.valueOf(earnRatioVnd)).longValue()
                : 0L;

        if (customer != null) {
            long currentPoints = customer.getPoints() != null ? customer.getPoints() : 0L;
            long balanceAfterRedeem = Math.max(0L, currentPoints - pointsToUse);
            long balanceAfterEarn = Math.max(0L, balanceAfterRedeem + pointsEarned);
            customer.setPoints(balanceAfterEarn);

            BigDecimal currentTotalSpent = customer.getTotalSpent() != null
                    ? customer.getTotalSpent()
                    : BigDecimal.ZERO;
            BigDecimal newTotalSpent = currentTotalSpent
                    .add(finalAmount)
                    .setScale(2, RoundingMode.HALF_UP);
            customer.setTotalSpent(newTotalSpent);
            customer.setTier(resolveTier(newTotalSpent));

            customerRepository.save(customer);
            recordLoyaltyTransactions(
                    customer,
                    branch,
                    billCode,
                    resolveCashier(request.getCashierUsername()),
                    pointsToUse,
                    pointsEarned,
                    balanceAfterRedeem,
                    balanceAfterEarn
            );
        }

        String preliminaryBillHash = HashUtil.generateBillHash(
                billCode,
                branch.getId(),
                finalAmount,
                checkoutTime
        );

        Bill bill = Bill.builder()
                .billCode(billCode)
                .idempotencyKey(idempotencyKey)
                .tableCode(request.getTableCode())
                .cashierUsername(resolveCashier(request.getCashierUsername()))
                .customerPhone(customerPhone)
                .grossAmount(grossAmount)
                .discountAmount(discountAmount)
                .pointsUsed(pointsToUse)
                .pointsEarned(pointsEarned)
                .finalAmount(finalAmount)
                .paymentMethod(request.getPaymentMethod())
                .status(BILL_STATUS_PAID)
                .billHash(preliminaryBillHash)
                .branch(branch)
                .createdAt(checkoutTime)
                .details(new ArrayList<>())
                .build();

        for (OrderLine orderLine : orderLines) {
            BillDetail detail = BillDetail.builder()
                    .bill(bill)
                    .product(orderLine.product())
                    .productName(orderLine.product().getName())
                    .unitPrice(orderLine.product().getPrice())
                    .quantity(orderLine.quantity())
                    .subtotal(orderLine.subtotal())
                    .build();

            bill.getDetails().add(detail);
        }

        Bill savedBill = billRepository.saveAndFlush(bill);

        if (savedBill.getCreatedAt() != null
                && !savedBill.getCreatedAt().equals(checkoutTime)) {
            savedBill.setBillHash(HashUtil.generateBillHash(
                    savedBill.getBillCode(),
                    branch.getId(),
                    savedBill.getFinalAmount(),
                    savedBill.getCreatedAt()
            ));
            savedBill = billRepository.saveAndFlush(savedBill);
        }

        CheckoutWeb3Event event = CheckoutWeb3Event.builder()
                .billCode(savedBill.getBillCode())
                .branchId(branch.getId())
                .customerPhone(customerPhone)
                .walletAddress(customer != null ? customer.getWalletAddress() : null)
                .pointsEarned(savedBill.getPointsEarned())
                .pointsUsed(savedBill.getPointsUsed())
                .discountAmount(savedBill.getDiscountAmount())
                .finalAmount(savedBill.getFinalAmount())
                .billHash(savedBill.getBillHash())
                .timestamp(savedBill.getCreatedAt())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME,
                    RabbitMQConfig.ROUTING_KEY,
                    event
            );
        } catch (Exception exception) {
            log.warn(
                    "Could not publish checkout event for billCode={}; blockchain sync will be skipped",
                    savedBill.getBillCode(),
                    exception
            );
        }

        return toResponse(savedBill, customer);
    }

    private void recordLoyaltyTransactions(
            Customer customer,
            Branch branch,
            String billCode,
            String cashierUsername,
            long pointsToUse,
            long pointsEarned,
            long balanceAfterRedeem,
            long balanceAfterEarn
    ) {
        List<LoyaltyTransaction> transactions = new ArrayList<>();

        if (pointsToUse > 0) {
            transactions.add(LoyaltyTransaction.builder()
                    .txCode("LT-" + billCode + "-REDEEM")
                    .customerId(customer.getId())
                    .customerPhone(customer.getPhone())
                    .type(TX_TYPE_REDEEM)
                    .pointsDelta(-pointsToUse)
                    .balanceAfter(balanceAfterRedeem)
                    .billCode(billCode)
                    .cashierUsername(cashierUsername)
                    .note("Đổi điểm giảm giá hóa đơn " + billCode)
                    .branch(branch)
                    .build());
        }

        if (pointsEarned > 0) {
            transactions.add(LoyaltyTransaction.builder()
                    .txCode("LT-" + billCode + "-EARN")
                    .customerId(customer.getId())
                    .customerPhone(customer.getPhone())
                    .type(TX_TYPE_EARN)
                    .pointsDelta(pointsEarned)
                    .balanceAfter(balanceAfterEarn)
                    .billCode(billCode)
                    .cashierUsername(cashierUsername)
                    .note("Tích điểm từ hóa đơn " + billCode)
                    .branch(branch)
                    .build());
        }

        if (!transactions.isEmpty()) {
            loyaltyTransactionRepository.saveAll(transactions);
        }
    }

    private Branch resolveBranch(Long requestedBranchId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof CustomUserDetails userDetails) {
            boolean branchBound = authentication.getAuthorities().stream()
                    .anyMatch(authority -> ROLE_MANAGER.equals(authority.getAuthority())
                            || ROLE_CASHIER.equals(authority.getAuthority()));
            Long assignedBranchId = userDetails.getBranchId();

            if (branchBound && assignedBranchId != null) {
                return branchRepository.findById(assignedBranchId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Branch not found for current user: " + assignedBranchId
                        ));
            }
        }

        return findBranch(requestedBranchId);
    }

    private LoyaltyConfig loadLoyaltyConfig() {
        return loyaltyConfigRepository.findById(LOYALTY_CONFIG_ID)
                .orElseGet(() -> LoyaltyConfig.builder()
                        .id(LOYALTY_CONFIG_ID)
                        .earnRatioVnd(DEFAULT_EARN_RATIO_VND)
                        .pointValueVnd(DEFAULT_POINT_VALUE_VND)
                        .minPointsToRedeem(DEFAULT_MIN_POINTS_TO_REDEEM)
                        .maxDiscountPercent(DEFAULT_MAX_DISCOUNT_PERCENT)
                        .allowEarn(true)
                        .allowRedeem(true)
                        .build());
    }

    private long positiveOrDefault(Long value, long fallback) {
        return value != null && value > 0 ? value : fallback;
    }

    private String resolveTier(BigDecimal totalSpent) {
        if (totalSpent == null) {
            return TIER_SILVER;
        }

        if (totalSpent.compareTo(DIAMOND_TIER_THRESHOLD) >= 0) {
            return TIER_DIAMOND;
        }

        if (totalSpent.compareTo(GOLD_TIER_THRESHOLD) >= 0) {
            return TIER_GOLD;
        }

        return TIER_SILVER;
    }

    private Branch findBranch(Long branchId) {
        return branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Branch not found with id: " + branchId
                ));
    }

    private void validateTable(String tableCode, Long branchId) {
        DiningTable table = diningTableRepository.findByCodeAndBranchId(tableCode, branchId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Dining table not found with code " + tableCode
                                + " in branch " + branchId
                ));

        if (TABLE_STATUS_DISABLED.equalsIgnoreCase(table.getStatus())) {
            throw new InvalidRedemptionException(
                    "Dining table " + tableCode + " is currently disabled"
            );
        }
    }

    private String resolveCashier(String fallbackUsername) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && StringUtils.hasText(authentication.getName())
                && !"anonymousUser".equals(authentication.getName())) {
            return authentication.getName();
        }

        return StringUtils.hasText(fallbackUsername) ? fallbackUsername.trim() : "pos";
    }

    private Map<Long, Integer> aggregateQuantities(List<CheckoutItemRequest> items) {
        Map<Long, Integer> quantities = new LinkedHashMap<>();

        for (CheckoutItemRequest item : items) {
            quantities.merge(item.getProductId(), item.getQuantity(), Integer::sum);
        }

        return quantities;
    }

    private CheckoutResponse toResponse(Bill bill) {
        Customer customer = StringUtils.hasText(bill.getCustomerPhone())
                ? customerRepository.findByPhone(bill.getCustomerPhone()).orElse(null)
                : null;
        return toResponse(bill, customer);
    }

    private CheckoutResponse toResponse(Bill bill, Customer customer) {
        return CheckoutResponse.builder()
                .billCode(bill.getBillCode())
                .tableCode(bill.getTableCode())
                .grossAmount(bill.getGrossAmount())
                .discountAmount(bill.getDiscountAmount())
                .pointsUsed(bill.getPointsUsed())
                .pointsEarned(bill.getPointsEarned())
                .pointsBalance(customer != null && customer.getPoints() != null ? customer.getPoints() : 0L)
                .customerTier(customer != null ? customer.getTier() : null)
                .customerPhone(bill.getCustomerPhone())
                .finalAmount(bill.getFinalAmount())
                .billHash(bill.getBillHash())
                .blockchainTxHash(bill.getBlockchainTxHash())
                .status(bill.getStatus())
                .createdAt(bill.getCreatedAt())
                .build();
    }

    private record OrderLine(Product product, int quantity, BigDecimal subtotal) {
    }
}
