package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.order.OrderResponse;
import blockchain.ChainPoint.dto.order.RefundRequest;
import blockchain.ChainPoint.dto.order.RefundResponse;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.entity.BillDetail;
import blockchain.ChainPoint.entity.Customer;
import blockchain.ChainPoint.entity.LoyaltyTransaction;
import blockchain.ChainPoint.entity.Product;
import blockchain.ChainPoint.entity.User;
import blockchain.ChainPoint.entity.enums.RoleType;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.exception.UnauthorizedOperationException;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.repository.CustomerRepository;
import blockchain.ChainPoint.repository.LoyaltyTransactionRepository;
import blockchain.ChainPoint.repository.ProductRepository;
import blockchain.ChainPoint.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final BillRepository billRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final LoyaltyTransactionRepository loyaltyTransactionRepository;
    private final BlockchainService blockchainService;

    @Override
    @Transactional(readOnly = true)
    public List<OrderResponse> getOrders(Long branchId) {
        List<Bill> bills;
        if (branchId != null) {
            bills = billRepository.findByBranchIdOrderByCreatedAtDesc(branchId);
        } else {
            bills = billRepository.findAllByOrderByCreatedAtDesc();
        }

        return bills.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderByCode(String billCode) {
        Bill bill = billRepository.findByBillCode(billCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng mã: " + billCode));
        return toResponse(bill);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RefundResponse refundOrder(String billCode, RefundRequest request) {
        // 1. Kiểm tra quyền hạn: Chỉ ROLE_MANAGER hoặc ROLE_OWNER mới được hoàn tiền
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String operatorUsername = null;
        boolean isAuthorized = false;

        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            operatorUsername = auth.getName();
            for (GrantedAuthority ga : auth.getAuthorities()) {
                if ("ROLE_MANAGER".equalsIgnoreCase(ga.getAuthority()) || "ROLE_OWNER".equalsIgnoreCase(ga.getAuthority())) {
                    isAuthorized = true;
                    break;
                }
            }
        }

        if (!isAuthorized && request != null && StringUtils.hasText(request.getManagerUsername())) {
            User user = userRepository.findByUsername(request.getManagerUsername().trim()).orElse(null);
            if (user != null && (user.getRole() == RoleType.ROLE_MANAGER || user.getRole() == RoleType.ROLE_OWNER)) {
                isAuthorized = true;
                operatorUsername = user.getUsername();
            }
        }

        if (!isAuthorized) {
            throw new UnauthorizedOperationException("Chỉ Quản lý (ROLE_MANAGER) hoặc Chủ nhà hàng (ROLE_OWNER) mới có quyền hoàn tiền hóa đơn!");
        }

        // 2. Tìm hóa đơn cần hoàn tiền
        Bill bill = billRepository.findByBillCode(billCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn với mã: " + billCode));

        if ("refunded".equalsIgnoreCase(bill.getStatus())) {
            throw new IllegalStateException("Hóa đơn " + billCode + " đã được hoàn tiền trước đó!");
        }

        if (!"paid".equalsIgnoreCase(bill.getStatus())) {
            throw new IllegalStateException("Chỉ hóa đơn đã thanh toán ('paid') mới được phép hoàn tiền!");
        }

        // 3. Xử lý Điểm Loyalty (Khách hàng)
        long pointsRestored = bill.getPointsUsed() != null ? bill.getPointsUsed() : 0L;
        long pointsRevoked = bill.getPointsEarned() != null ? bill.getPointsEarned() : 0L;
        BigDecimal actualRefundAmount = request != null && request.getRefundAmount() != null
                ? request.getRefundAmount()
                : bill.getFinalAmount();

        Customer customer = null;
        if (StringUtils.hasText(bill.getCustomerPhone())) {
            customer = customerRepository.findByPhone(bill.getCustomerPhone().trim()).orElse(null);
        }

        if (customer != null) {
            long currentPoints = customer.getPoints() != null ? customer.getPoints() : 0L;
            // 3.1. Hoàn lại điểm khách đã dùng lúc thanh toán
            currentPoints += pointsRestored;

            // 3.2. Thu hồi điểm khách đã được tích từ đơn này
            if (currentPoints >= pointsRevoked) {
                currentPoints -= pointsRevoked;
            } else {
                // Nếu khách đã dùng hết điểm tích lũy: trừ khoản chênh lệch điểm vào số tiền hoàn lại (1 điểm = 1.000 VNĐ)
                long missingPoints = pointsRevoked - currentPoints;
                BigDecimal deduction = BigDecimal.valueOf(missingPoints).multiply(BigDecimal.valueOf(1000L));
                actualRefundAmount = actualRefundAmount.subtract(deduction);
                if (actualRefundAmount.compareTo(BigDecimal.ZERO) < 0) {
                    actualRefundAmount = BigDecimal.ZERO;
                }
                currentPoints = 0L;
            }

            customer.setPoints(currentPoints);

            // Giảm tổng chi tiêu của khách
            BigDecimal currentSpent = customer.getTotalSpent() != null ? customer.getTotalSpent() : BigDecimal.ZERO;
            BigDecimal updatedSpent = currentSpent.subtract(bill.getFinalAmount());
            if (updatedSpent.compareTo(BigDecimal.ZERO) < 0) {
                updatedSpent = BigDecimal.ZERO;
            }
            customer.setTotalSpent(updatedSpent);
            customerRepository.save(customer);

            // Ghi nhật ký giao dịch điểm
            LoyaltyTransaction lt = LoyaltyTransaction.builder()
                    .txCode("RF" + System.currentTimeMillis())
                    .customer(customer)
                    .bill(bill)
                    .type("REFUND")
                    .pointsDelta(pointsRestored - pointsRevoked)
                    .balanceAfter(currentPoints)
                    .note("Hoàn tiền đơn " + billCode + ". Lý do: " + (request != null ? request.getReason() : "Quản lý hoàn tiền"))
                    .build();
            loyaltyTransactionRepository.save(lt);
        }

        // 4. Khôi phục số lượng tồn kho sản phẩm (Restore Stock)
        if (bill.getDetails() != null) {
            for (BillDetail detail : bill.getDetails()) {
                if (detail.getProduct() != null && detail.getQuantity() != null) {
                    Product product = productRepository.findById(detail.getProduct().getId()).orElse(null);
                    if (product != null) {
                        int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
                        product.setStockQuantity(stock + detail.getQuantity());
                        productRepository.save(product);
                    }
                }
            }
        }

        // 5. Cập nhật trạng thái Hóa đơn sang 'refunded'
        bill.setStatus("refunded");

        // 6. Ghi nhận giao dịch hoàn tiền lên Blockchain Sepolia qua Smart Contract RestaurantLoyalty.sol
        String blockchainTxHash = null;
        try {
            String walletAddress = customer != null ? customer.getWalletAddress() : null;
            blockchainTxHash = blockchainService.refundOrder(
                    bill.getBillCode(),
                    walletAddress,
                    bill.getCustomerPhone(),
                    pointsRestored,
                    pointsRevoked,
                    actualRefundAmount,
                    request != null ? request.getReason() : "Quản lý hoàn tiền"
            );
            bill.setBlockchainTxHash(blockchainTxHash);
            log.info("Blockchain refund transaction submitted: txHash={}", blockchainTxHash);
        } catch (Exception ex) {
            log.warn("Web3 refundOrder call skipped/failed (network/gas limit): {}", ex.getMessage());
        }

        billRepository.save(bill);

        return RefundResponse.builder()
                .billCode(bill.getBillCode())
                .status("refunded")
                .pointsRestored(pointsRestored)
                .pointsRevoked(pointsRevoked)
                .actualRefundAmount(actualRefundAmount)
                .reason(request != null ? request.getReason() : "Quản lý hoàn tiền")
                .processedBy(operatorUsername)
                .blockchainTxHash(blockchainTxHash)
                .refundedAt(LocalDateTime.now())
                .message("Đã hoàn tiền đơn hàng thành công, cập nhật điểm và kho.")
                .build();
    }

    private OrderResponse toResponse(Bill bill) {
        String customerName = "Khách vãng lai";
        if (bill.getCustomerPhone() != null && !bill.getCustomerPhone().isBlank()) {
            customerName = customerRepository.findByPhone(bill.getCustomerPhone())
                    .map(c -> c.getName())
                    .orElse(bill.getCustomerPhone());
        }

        List<OrderResponse.OrderItemResponse> items = bill.getDetails().stream()
                .map(d -> OrderResponse.OrderItemResponse.builder()
                        .productId(d.getProduct() != null ? d.getProduct().getId() : null)
                        .productName(d.getProductName())
                        .unitPrice(d.getUnitPrice())
                        .quantity(d.getQuantity())
                        .subtotal(d.getSubtotal())
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(bill.getId())
                .billCode(bill.getBillCode())
                .branchId(bill.getBranch() != null ? bill.getBranch().getId() : null)
                .branchName(bill.getBranch() != null ? bill.getBranch().getName() : "")
                .tableCode(bill.getTableCode())
                .cashierUsername(bill.getCashierUsername())
                .customerPhone(bill.getCustomerPhone())
                .customerName(customerName)
                .grossAmount(bill.getGrossAmount())
                .discountAmount(bill.getDiscountAmount())
                .pointsUsed(bill.getPointsUsed())
                .pointsEarned(bill.getPointsEarned())
                .finalAmount(bill.getFinalAmount())
                .paymentMethod(bill.getPaymentMethod())
                .status(bill.getStatus())
                .billHash(bill.getBillHash())
                .blockchainTxHash(bill.getBlockchainTxHash())
                .createdAt(bill.getCreatedAt())
                .items(items)
                .build();
    }
}
