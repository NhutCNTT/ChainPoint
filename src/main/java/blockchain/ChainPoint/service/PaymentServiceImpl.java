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
    private final Map<String, Boolean> simulatedPayments = new ConcurrentHashMap<>();

    private final String bankCode;
    private final String bankName;
    private final String accountNumber;
    private final String accountName;
    private final String template;

    public PaymentServiceImpl(
            BillRepository billRepository,
            @Value("${payment.bank-code:970422}") String bankCode,
            @Value("${payment.bank-name:MBBank (Napas 247)}") String bankName,
            @Value("${payment.account-number:0387654321}") String accountNumber,
            @Value("${payment.account-name:CONG TY CO PHAN CHAINPOINT}") String accountName,
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
                .paid(Boolean.TRUE.equals(simulatedPayments.get(billCode)))
                .build();
    }

    @Override
    public PaymentStatusResponse simulatePayment(String billCode) {
        simulatedPayments.put(billCode, Boolean.TRUE);

        return PaymentStatusResponse.builder()
                .billCode(billCode)
                .paid(true)
                .build();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
