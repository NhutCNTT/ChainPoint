package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.payment.*;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.security.BranchAccess;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Objects;

@Service
@Transactional
public class PaymentServiceImpl implements PaymentService {
    private final BillRepository bills;
    private final BranchAccess access;
    private final SettlementService settlement;
    private final String bankCode, bankName, accountNumber, accountName, template, webhookSecret;

    public PaymentServiceImpl(BillRepository bills, BranchAccess access, SettlementService settlement,
            @Value("${payment.bank-code:}") String bankCode,
            @Value("${payment.bank-name:}") String bankName,
            @Value("${payment.account-number:}") String accountNumber,
            @Value("${payment.account-name:}") String accountName,
            @Value("${payment.template:compact2}") String template,
            @Value("${payment.webhook-secret:}") String webhookSecret) {
        this.bills = bills; this.access = access; this.settlement = settlement;
        this.bankCode = bankCode; this.bankName = bankName; this.accountNumber = accountNumber;
        this.accountName = accountName; this.template = template; this.webhookSecret = webhookSecret;
    }

    @Override
    @Transactional(readOnly = true)
    public VietQrInfoResponse getVietQrInfo(String billCode, BigDecimal ignoredClientAmount) {
        Bill bill = find(billCode); access.check(bill.getBranch().getId());
        if (!"transfer".equals(bill.getPaymentMethod()) || !"pending".equals(bill.getStatus())) throw new IllegalArgumentException("Prepare a pending transfer first");
        if (bankCode.isBlank() || accountNumber.isBlank() || accountName.isBlank() || webhookSecret.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Verified bank payment integration is not configured");
        String qr = "https://img.vietqr.io/image/" + encode(bankCode) + "-" + encode(accountNumber) + "-" + encode(template) + ".png?amount="
                + bill.getFinalAmount().toBigIntegerExact() + "&addInfo=" + encode(billCode) + "&accountName=" + encode(accountName);
        return VietQrInfoResponse.builder().billCode(billCode).amount(bill.getFinalAmount()).bankCode(bankCode)
                .bankName(bankName).accountNumber(accountNumber).accountName(accountName).qrImageUrl(qr).build();
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentStatusResponse getStatus(String billCode) {
        Bill bill = find(billCode); access.check(bill.getBranch().getId()); return status(bill);
    }

    @Override
    public PaymentStatusResponse confirm(ProviderConfirmation request, String signature) {
        if (webhookSecret.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Payment verification is not configured");
        long now = Instant.now().getEpochSecond();
        if (request.getTimestamp() < now - 300 || request.getTimestamp() > now + 300) throw new AccessDeniedException("Stale payment callback");
        String payload = request.getBillCode() + "\n" + request.getAmount().toPlainString() + "\n" + request.getReference() + "\n" + request.getTimestamp();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            if (!MessageDigest.isEqual(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)), HexFormat.of().parseHex(signature))) throw new AccessDeniedException("Invalid payment signature");
        } catch (java.security.GeneralSecurityException | IllegalArgumentException exception) { throw new AccessDeniedException("Invalid payment signature"); }
        Bill bill = bills.findForUpdate(request.getBillCode()).orElseThrow(() -> new ResourceNotFoundException("Bill not found"));
        if (!"transfer".equals(bill.getPaymentMethod()) || bill.getFinalAmount().compareTo(request.getAmount()) != 0) throw new IllegalArgumentException("Payment method or amount mismatch");
        if (bill.getProviderReference() != null && !Objects.equals(bill.getProviderReference(), request.getReference())) throw new IllegalArgumentException("Bill already has a different payment receipt");
        settlement.confirmTransfer(bill);
        bill.setProviderReference(request.getReference()); bills.saveAndFlush(bill);
        return status(bill);
    }

    private Bill find(String code) { return bills.findByBillCode(code).orElseThrow(() -> new ResourceNotFoundException("Bill not found")); }
    private PaymentStatusResponse status(Bill bill) { return PaymentStatusResponse.builder().billCode(bill.getBillCode()).paid("paid".equals(bill.getStatus())).build(); }
    private String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
}
