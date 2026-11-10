package blockchain.ChainPoint.service;

import blockchain.ChainPoint.config.RabbitMQConfig;
import blockchain.ChainPoint.dto.pos.CheckoutItemRequest;
import blockchain.ChainPoint.dto.pos.CheckoutRequest;
import blockchain.ChainPoint.dto.pos.CheckoutResponse;
import blockchain.ChainPoint.entity.Branch;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.entity.BillDetail;
import blockchain.ChainPoint.entity.Customer;
import blockchain.ChainPoint.entity.Product;
import blockchain.ChainPoint.event.CheckoutWeb3Event;
import blockchain.ChainPoint.exception.InsufficientStockException;
import blockchain.ChainPoint.exception.InvalidRedemptionException;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.repository.BranchRepository;
import blockchain.ChainPoint.repository.CustomerRepository;
import blockchain.ChainPoint.repository.DiningTableRepository;
import blockchain.ChainPoint.repository.ProductRepository;
import blockchain.ChainPoint.util.HashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
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
@RequiredArgsConstructor
public class CheckoutServiceImpl implements CheckoutService {

    private static final BigDecimal VND_PER_REDEEMED_POINT = BigDecimal.valueOf(1000L);
    private static final BigDecimal VND_PER_EARNED_POINT = BigDecimal.valueOf(10000L);
    private static final long MINIMUM_POINTS_TO_REDEEM = 5L;
    private static final String BILL_STATUS_PAID = "paid";

    private final BranchRepository branchRepository;
    private final DiningTableRepository diningTableRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final BillRepository billRepository;
    private final RabbitTemplate rabbitTemplate;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public CheckoutResponse processCheckout(CheckoutRequest request) {
        Branch branch = findBranch(request.getBranchId());
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

        long pointsToUse = request.getPointsToUse() != null ? request.getPointsToUse() : 0L;
        if (pointsToUse < 0) {
            throw new InvalidRedemptionException("Points to use cannot be negative");
        }

        BigDecimal discountAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        if (pointsToUse > 0) {
            if (customer == null) {
                throw new InvalidRedemptionException(
                        "A registered customer is required to redeem loyalty points"
                );
            }

            if (pointsToUse < MINIMUM_POINTS_TO_REDEEM) {
                throw new InvalidRedemptionException(
                        "Minimum points to redeem is " + MINIMUM_POINTS_TO_REDEEM
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
                    .multiply(VND_PER_REDEEMED_POINT)
                    .setScale(2, RoundingMode.HALF_UP);

            if (discountAmount.multiply(BigDecimal.valueOf(2L)).compareTo(grossAmount) > 0) {
                throw new InvalidRedemptionException(
                        "Discount cannot exceed 50% of the gross amount"
                );
            }
        }

        BigDecimal finalAmount = grossAmount
                .subtract(discountAmount)
                .setScale(2, RoundingMode.HALF_UP);

        long pointsEarned = finalAmount
                .divideToIntegralValue(VND_PER_EARNED_POINT)
                .longValue();

        if (customer != null) {
            long currentPoints = customer.getPoints() != null ? customer.getPoints() : 0L;
            customer.setPoints(currentPoints - pointsToUse + pointsEarned);

            BigDecimal currentTotalSpent = customer.getTotalSpent() != null
                    ? customer.getTotalSpent()
                    : BigDecimal.ZERO;
            customer.setTotalSpent(
                    currentTotalSpent.add(finalAmount).setScale(2, RoundingMode.HALF_UP)
            );

            customerRepository.save(customer);
        }

        String billCode = "HD" + System.currentTimeMillis();
        LocalDateTime checkoutTime = LocalDateTime.now();
        String preliminaryBillHash = HashUtil.generateBillHash(
                billCode,
                branch.getId(),
                finalAmount,
                checkoutTime
        );

        Bill bill = Bill.builder()
                .billCode(billCode)
                .tableCode(request.getTableCode())
                .cashierUsername(request.getCashierUsername())
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
                .finalAmount(savedBill.getFinalAmount())
                .billHash(savedBill.getBillHash())
                .timestamp(savedBill.getCreatedAt())
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY,
                event
        );

        return toResponse(savedBill);
    }

    private Branch findBranch(Long branchId) {
        return branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Branch not found with id: " + branchId
                ));
    }

    private void validateTable(String tableCode, Long branchId) {
        diningTableRepository.findByCodeAndBranchId(tableCode, branchId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Dining table not found with code " + tableCode
                                + " in branch " + branchId
                ));
    }

    private Map<Long, Integer> aggregateQuantities(List<CheckoutItemRequest> items) {
        Map<Long, Integer> quantities = new LinkedHashMap<>();

        for (CheckoutItemRequest item : items) {
            quantities.merge(item.getProductId(), item.getQuantity(), Integer::sum);
        }

        return quantities;
    }

    private CheckoutResponse toResponse(Bill bill) {
        return CheckoutResponse.builder()
                .billCode(bill.getBillCode())
                .tableCode(bill.getTableCode())
                .grossAmount(bill.getGrossAmount())
                .discountAmount(bill.getDiscountAmount())
                .pointsUsed(bill.getPointsUsed())
                .pointsEarned(bill.getPointsEarned())
                .finalAmount(bill.getFinalAmount())
                .billHash(bill.getBillHash())
                .status(bill.getStatus())
                .createdAt(bill.getCreatedAt())
                .build();
    }

    private record OrderLine(Product product, int quantity, BigDecimal subtotal) {
    }
}
