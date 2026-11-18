package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.order.OrderItemResponse;
import blockchain.ChainPoint.dto.order.OrderResponse;
import blockchain.ChainPoint.dto.order.RefundRequest;
import blockchain.ChainPoint.dto.order.RefundResponse;
import blockchain.ChainPoint.config.Web3Config;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.entity.BillDetail;
import blockchain.ChainPoint.entity.Customer;
import blockchain.ChainPoint.entity.Product;
import blockchain.ChainPoint.exception.InvalidRedemptionException;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.repository.CustomerRepository;
import blockchain.ChainPoint.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private static final String STATUS_PAID = "paid";
    private static final String STATUS_REFUNDED = "refunded";
    private static final String STATUS_AVAILABLE = "available";
    private static final String STATUS_OUT_OF_STOCK = "out_of_stock";
    private static final String ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

    private final BillRepository billRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final BlockchainService blockchainService;
    private final Web3Config web3Config;

    @Override
    public List<OrderResponse> getOrders(
            Long branchId,
            String status,
            LocalDateTime from,
            LocalDateTime to
    ) {
        String statusFilter = StringUtils.hasText(status) ? status.trim() : null;

        return billRepository.searchBills(branchId, statusFilter, from, to).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public OrderResponse getOrder(String billCode) {
        Bill bill = billRepository.findDetailedByBillCode(billCode)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found: " + billCode));

        return toResponse(bill);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RefundResponse refundOrder(String billCode, RefundRequest request, String processedBy) {
        Bill bill = billRepository.findDetailedByBillCode(billCode)
                .orElseThrow(() -> new ResourceNotFoundException("Bill not found: " + billCode));

        if (!STATUS_PAID.equalsIgnoreCase(bill.getStatus())) {
            throw new InvalidRedemptionException(
                    "Only paid bills can be refunded. Current status: " + bill.getStatus()
            );
        }

        restoreStock(bill);

        long pointsRestored = bill.getPointsUsed() != null ? bill.getPointsUsed() : 0L;
        long pointsRevoked = bill.getPointsEarned() != null ? bill.getPointsEarned() : 0L;

        Customer customer = null;
        if (StringUtils.hasText(bill.getCustomerPhone())) {
            customer = customerRepository.findByPhone(bill.getCustomerPhone()).orElse(null);
            if (customer != null) {
                adjustCustomer(customer, bill, pointsRestored, pointsRevoked);
            }
        }

        bill.setStatus(STATUS_REFUNDED);
        if (request != null && StringUtils.hasText(request.getReason())) {
            bill.setRefundReason(request.getReason().trim());
        }

        String actor = StringUtils.hasText(processedBy)
                ? processedBy
                : (request != null && StringUtils.hasText(request.getManagerUsername())
                ? request.getManagerUsername()
                : "manager");

        Bill saved = billRepository.saveAndFlush(bill);

        String refundTxHash = syncRefundOnChain(saved, customer, pointsRestored, pointsRevoked);
        if (StringUtils.hasText(refundTxHash)) {
            saved.setRefundTxHash(refundTxHash);
            saved = billRepository.saveAndFlush(saved);
        }

        String reportedTxHash = StringUtils.hasText(saved.getRefundTxHash())
                ? saved.getRefundTxHash()
                : saved.getBlockchainTxHash();

        return RefundResponse.builder()
                .billCode(saved.getBillCode())
                .actualRefundAmount(saved.getFinalAmount() != null
                        ? saved.getFinalAmount()
                        : BigDecimal.ZERO)
                .pointsRestored(pointsRestored)
                .pointsRevoked(pointsRevoked)
                .processedBy(actor)
                .blockchainTxHash(reportedTxHash)
                .status(saved.getStatus())
                .reason(saved.getRefundReason())
                .build();
    }

    private String syncRefundOnChain(
            Bill bill,
            Customer customer,
            long pointsRestored,
            long pointsRevoked
    ) {
        if (!isBlockchainConfigured()
                || !StringUtils.hasText(bill.getBlockchainTxHash())
                || !StringUtils.hasText(bill.getCustomerPhone())) {
            return null;
        }

        try {
            String txHash = blockchainService.refundOrder(
                    bill.getBillCode(),
                    customer != null ? customer.getWalletAddress() : null,
                    bill.getCustomerPhone(),
                    pointsRestored,
                    pointsRevoked,
                    bill.getFinalAmount() != null ? bill.getFinalAmount() : BigDecimal.ZERO,
                    bill.getRefundReason() != null ? bill.getRefundReason() : ""
            );
            log.info("Refund synced on-chain for billCode={} txHash={}", bill.getBillCode(), txHash);
            return txHash;
        } catch (Exception exception) {
            log.warn(
                    "On-chain refund sync failed for billCode={}; database refund is kept",
                    bill.getBillCode(),
                    exception
            );
            return null;
        }
    }

    private boolean isBlockchainConfigured() {
        String contractAddress = web3Config.getContractAddress();
        return StringUtils.hasText(contractAddress)
                && !ZERO_ADDRESS.equalsIgnoreCase(contractAddress.trim());
    }

    private void restoreStock(Bill bill) {
        for (BillDetail detail : bill.getDetails()) {
            Product product = productRepository.findByIdForUpdate(detail.getProduct().getId())
                    .orElse(null);

            if (product == null) {
                continue;
            }

            int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
            int quantity = detail.getQuantity() != null ? detail.getQuantity() : 0;
            product.setStockQuantity(stock + quantity);

            if (STATUS_OUT_OF_STOCK.equalsIgnoreCase(product.getStatus()) && product.getStockQuantity() > 0) {
                product.setStatus(STATUS_AVAILABLE);
            }

            productRepository.save(product);
        }
    }

    private void adjustCustomer(Customer customer, Bill bill, long pointsRestored, long pointsRevoked) {
        long currentPoints = customer.getPoints() != null ? customer.getPoints() : 0L;
        long newPoints = currentPoints + pointsRestored - pointsRevoked;
        customer.setPoints(Math.max(0L, newPoints));

        BigDecimal currentTotalSpent = customer.getTotalSpent() != null
                ? customer.getTotalSpent()
                : BigDecimal.ZERO;
        BigDecimal refunded = bill.getFinalAmount() != null ? bill.getFinalAmount() : BigDecimal.ZERO;
        BigDecimal newTotalSpent = currentTotalSpent.subtract(refunded).max(BigDecimal.ZERO);
        customer.setTotalSpent(newTotalSpent.setScale(2, RoundingMode.HALF_UP));

        customerRepository.save(customer);
    }

    private OrderResponse toResponse(Bill bill) {
        Customer customer = StringUtils.hasText(bill.getCustomerPhone())
                ? customerRepository.findByPhone(bill.getCustomerPhone()).orElse(null)
                : null;

        List<OrderItemResponse> items = bill.getDetails().stream()
                .map(this::toItemResponse)
                .toList();

        return OrderResponse.builder()
                .id(bill.getId())
                .billCode(bill.getBillCode())
                .branchId(bill.getBranch() != null ? bill.getBranch().getId() : null)
                .branchName(bill.getBranch() != null ? bill.getBranch().getName() : null)
                .tableCode(bill.getTableCode())
                .cashierUsername(bill.getCashierUsername())
                .customerName(customer != null ? customer.getName() : null)
                .customerPhone(bill.getCustomerPhone())
                .grossAmount(bill.getGrossAmount())
                .discountAmount(bill.getDiscountAmount())
                .pointsUsed(bill.getPointsUsed())
                .pointsEarned(bill.getPointsEarned())
                .finalAmount(bill.getFinalAmount())
                .paymentMethod(bill.getPaymentMethod())
                .status(bill.getStatus())
                .billHash(bill.getBillHash())
                .blockchainTxHash(bill.getBlockchainTxHash())
                .loyaltyTxHash(bill.getLoyaltyTxHash())
                .refundReason(bill.getRefundReason())
                .createdAt(bill.getCreatedAt())
                .items(items)
                .build();
    }

    private OrderItemResponse toItemResponse(BillDetail detail) {
        return OrderItemResponse.builder()
                .productId(detail.getProduct() != null ? detail.getProduct().getId() : null)
                .productName(detail.getProductName())
                .unitPrice(detail.getUnitPrice())
                .quantity(detail.getQuantity())
                .subtotal(detail.getSubtotal())
                .build();
    }
}
