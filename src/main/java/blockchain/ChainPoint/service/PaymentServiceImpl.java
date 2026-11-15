package blockchain.ChainPoint.service;

import blockchain.ChainPoint.config.RabbitMQConfig;
import blockchain.ChainPoint.dto.payment.BankWebhookPayload;
import blockchain.ChainPoint.dto.payment.PaymentStatusResponse;
import blockchain.ChainPoint.dto.payment.VietQRInfoResponse;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.entity.Customer;
import blockchain.ChainPoint.entity.LoyaltyTransaction;
import blockchain.ChainPoint.event.CheckoutWeb3Event;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.repository.CustomerRepository;
import blockchain.ChainPoint.repository.LoyaltyTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private static final String DEFAULT_BANK_BIN = "970422"; // MBBank
    private static final String DEFAULT_BANK_NAME = "MBBank - Ngân hàng TMCP Quân Đội";
    private static final String DEFAULT_ACCOUNT_NUMBER = "0387654321";
    private static final String DEFAULT_ACCOUNT_NAME = "CONG TY CO PHAN CHAINPOINT";
    private static final String DEFAULT_QR_TEMPLATE = "compact2";

    private final BillRepository billRepository;
    private final CustomerRepository customerRepository;
    private final LoyaltyTransactionRepository loyaltyTransactionRepository;
    private final RabbitTemplate rabbitTemplate;
    private final BlockchainService blockchainService;

    @Override
    public VietQRInfoResponse generateVietQRInfo(String billCode, BigDecimal amount) {
        BigDecimal paymentAmount = amount != null ? amount : BigDecimal.ZERO;

        if ((paymentAmount.compareTo(BigDecimal.ZERO) <= 0) && StringUtils.hasText(billCode)) {
            billRepository.findByBillCode(billCode).ifPresent(bill -> {
                // lấy số tiền từ hóa đơn nếu amount chưa truyền
            });
        }

        String memo = StringUtils.hasText(billCode) ? billCode.trim() : "CHAINPOINT";
        String encodedAccountName = URLEncoder.encode(DEFAULT_ACCOUNT_NAME, StandardCharsets.UTF_8);
        String encodedMemo = URLEncoder.encode(memo, StandardCharsets.UTF_8);

        String qrImageUrl = String.format(
                "https://img.vietqr.io/image/%s-%s-%s.png?amount=%s&addInfo=%s&accountName=%s",
                DEFAULT_BANK_BIN,
                DEFAULT_ACCOUNT_NUMBER,
                DEFAULT_QR_TEMPLATE,
                paymentAmount.toBigInteger().toString(),
                encodedMemo,
                encodedAccountName
        );

        return VietQRInfoResponse.builder()
                .bankBin(DEFAULT_BANK_BIN)
                .bankName(DEFAULT_BANK_NAME)
                .accountNumber(DEFAULT_ACCOUNT_NUMBER)
                .accountName(DEFAULT_ACCOUNT_NAME)
                .qrTemplate(DEFAULT_QR_TEMPLATE)
                .qrImageUrl(qrImageUrl)
                .billCode(memo)
                .amount(paymentAmount)
                .description("Chuyển khoản thanh toán đơn hàng " + memo)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatusResponse checkPaymentStatus(String billCode) {
        Bill bill = billRepository.findByBillCode(billCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn mã: " + billCode));

        boolean isPaid = "paid".equalsIgnoreCase(bill.getStatus());

        return PaymentStatusResponse.builder()
                .billCode(bill.getBillCode())
                .status(bill.getStatus())
                .paid(isPaid)
                .amount(bill.getFinalAmount())
                .paidAt(bill.getCreatedAt())
                .paymentMethod(bill.getPaymentMethod())
                .blockchainTxHash(bill.getBlockchainTxHash())
                .build();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentStatusResponse processWebhook(BankWebhookPayload payload) {
        log.info("Received Bank Webhook: gateway={}, amount={}, content={}",
                payload.getGateway(), payload.getTransferAmount(), payload.getContent());

        String targetBillCode = extractBillCode(payload);
        if (!StringUtils.hasText(targetBillCode)) {
            throw new IllegalArgumentException("Không thể nhận diện mã hóa đơn từ nội dung chuyển khoản: " + payload.getContent());
        }

        Bill bill = billRepository.findByBillCode(targetBillCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn tương ứng với mã: " + targetBillCode));

        return completePayment(bill, payload.getTransferAmount(), "transfer");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PaymentStatusResponse simulatePayment(String billCode, BigDecimal amount) {
        log.info("Simulating VietQR payment for billCode={}, amount={}", billCode, amount);

        Bill bill = billRepository.findByBillCode(billCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hóa đơn mã: " + billCode));

        BigDecimal paymentAmount = amount != null ? amount : bill.getFinalAmount();
        return completePayment(bill, paymentAmount, "transfer");
    }

    private PaymentStatusResponse completePayment(Bill bill, BigDecimal transferredAmount, String method) {
        if ("paid".equalsIgnoreCase(bill.getStatus())) {
            log.info("Hóa đơn {} đã ở trạng thái paid từ trước", bill.getBillCode());
            return PaymentStatusResponse.builder()
                    .billCode(bill.getBillCode())
                    .status(bill.getStatus())
                    .paid(true)
                    .amount(bill.getFinalAmount())
                    .paidAt(bill.getCreatedAt())
                    .paymentMethod(bill.getPaymentMethod())
                    .blockchainTxHash(bill.getBlockchainTxHash())
                    .build();
        }

        // Cập nhật trạng thái hóa đơn
        bill.setStatus("paid");
        bill.setPaymentMethod(method);

        // Xử lý tích điểm hội viên
        Customer customer = null;
        if (StringUtils.hasText(bill.getCustomerPhone())) {
            customer = customerRepository.findByPhone(bill.getCustomerPhone().trim()).orElse(null);
            if (customer != null && bill.getPointsEarned() != null && bill.getPointsEarned() > 0) {
                long currentPoints = customer.getPoints() != null ? customer.getPoints() : 0L;
                long updatedPoints = currentPoints + bill.getPointsEarned();
                customer.setPoints(updatedPoints);

                BigDecimal currentSpent = customer.getTotalSpent() != null ? customer.getTotalSpent() : BigDecimal.ZERO;
                customer.setTotalSpent(currentSpent.add(bill.getFinalAmount()));
                customerRepository.save(customer);

                // Ghi nhận Loyalty Transaction
                LoyaltyTransaction tx = LoyaltyTransaction.builder()
                        .txCode("PAY" + System.currentTimeMillis())
                        .customer(customer)
                        .bill(bill)
                        .type("EARN")
                        .pointsDelta(bill.getPointsEarned())
                        .balanceAfter(updatedPoints)
                        .note("Tích điểm tự động qua VietQR đơn " + bill.getBillCode())
                        .build();
                loyaltyTransactionRepository.save(tx);
            }
        }

        Bill savedBill = billRepository.save(bill);

        // Bắn sự kiện Web3 sang RabbitMQ hoặc thực hiện trực tiếp
        try {
            CheckoutWeb3Event event = CheckoutWeb3Event.builder()
                    .billCode(savedBill.getBillCode())
                    .branchId(savedBill.getBranch() != null ? savedBill.getBranch().getId() : 1L)
                    .customerPhone(savedBill.getCustomerPhone())
                    .walletAddress(customer != null ? customer.getWalletAddress() : null)
                    .pointsEarned(savedBill.getPointsEarned())
                    .pointsUsed(savedBill.getPointsUsed())
                    .finalAmount(savedBill.getFinalAmount())
                    .billHash(savedBill.getBillHash())
                    .timestamp(LocalDateTime.now())
                    .build();

            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME,
                    RabbitMQConfig.ROUTING_KEY,
                    event
            );
        } catch (Exception ex) {
            log.warn("Không thể gửi event RabbitMQ (sẽ thử gọi Web3 trực tiếp): {}", ex.getMessage());
            try {
                String tx = blockchainService.recordInvoice(
                        savedBill.getBillCode(),
                        savedBill.getBranch() != null ? savedBill.getBranch().getId() : 1L,
                        savedBill.getFinalAmount(),
                        savedBill.getBillHash()
                );
                savedBill.setBlockchainTxHash(tx);
                billRepository.save(savedBill);
            } catch (Exception ignored) {
            }
        }

        return PaymentStatusResponse.builder()
                .billCode(savedBill.getBillCode())
                .status("paid")
                .paid(true)
                .amount(savedBill.getFinalAmount())
                .paidAt(LocalDateTime.now())
                .paymentMethod(savedBill.getPaymentMethod())
                .blockchainTxHash(savedBill.getBlockchainTxHash())
                .build();
    }

    private String extractBillCode(BankWebhookPayload payload) {
        if (StringUtils.hasText(payload.getBillCode())) {
            return payload.getBillCode().trim();
        }

        String content = payload.getContent();
        if (!StringUtils.hasText(content)) {
            return null;
        }

        // Tìm mẫu HDxxx hoặc BILLxxx
        Pattern pattern = Pattern.compile("(?i)(HD\\d+|BILL\\d+|HD[A-Z0-9]+)");
        Matcher matcher = pattern.matcher(content);
        if (matcher.find()) {
            return matcher.group(1).toUpperCase();
        }

        return content.trim();
    }
}
