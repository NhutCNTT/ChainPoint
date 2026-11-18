package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.payment.PaymentStatusResponse;
import blockchain.ChainPoint.dto.payment.VietQrInfoResponse;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.repository.BillRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PaymentServiceImpl implements PaymentService {

    private final BillRepository billRepository;

    private final String bankCode;
    private final String bankName;
    private final String accountNumber;
    private final String accountName;
    private final String template;

    public PaymentServiceImpl(
            BillRepository billRepository,
            @Value("${payment.bank-code:}") String bankCode,
            @Value("${payment.bank-name:}") String bankName,
            @Value("${payment.account-number:}") String accountNumber,
            @Value("${payment.account-name:}") String accountName,
            @Value("${payment.template:compact2}") String template
    ) {
        this.billRepository = billRepository;
        this.bankCode = bankCode;
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.accountName = accountName;
        this.template = template;
    }

    @Override
    public VietQrInfoResponse getVietQrInfo(String billCode, BigDecimal amount) {
        if (!StringUtils.hasText(bankCode) || !StringUtils.hasText(accountNumber) || !StringUtils.hasText(accountName)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Payment bank account has not been configured");
        }
        if (amount != null && amount.signum() < 0) throw new IllegalArgumentException("Amount cannot be negative");
        BigDecimal resolvedAmount = amount;

        if (resolvedAmount == null && StringUtils.hasText(billCode)) {
            resolvedAmount = billRepository.findByBillCode(billCode)
                    .map(Bill::getFinalAmount)
                    .orElse(BigDecimal.ZERO);
        }

        if (resolvedAmount == null) {
            resolvedAmount = BigDecimal.ZERO;
        }

        String memo = StringUtils.hasText(billCode) ? billCode : "ChainPoint";
        String qrUrl = "https://img.vietqr.io/image/"
                + bankCode + "-" + accountNumber + "-" + template + ".png"
                + "?amount=" + resolvedAmount.toBigInteger()
                + "&addInfo=" + encode(memo)
                + "&accountName=" + encode(accountName);

        return VietQrInfoResponse.builder()
                .billCode(billCode)
                .amount(resolvedAmount)
                .bankCode(bankCode)
                .bankName(bankName)
                .accountName(accountName)
                .accountNumber(accountNumber)
                .qrImageUrl(qrUrl)
                .build();
    }

    @Override
    public PaymentStatusResponse getStatus(String billCode) {
        return PaymentStatusResponse.builder()
                .billCode(billCode)
                .paid(billRepository.findByBillCode(billCode)
                        .map(bill -> "paid".equals(bill.getStatus())).orElse(false))
                .build();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
