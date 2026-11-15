package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.payment.BankWebhookPayload;
import blockchain.ChainPoint.dto.payment.PaymentStatusResponse;
import blockchain.ChainPoint.dto.payment.VietQRInfoResponse;

import java.math.BigDecimal;

public interface PaymentService {

    VietQRInfoResponse generateVietQRInfo(String billCode, BigDecimal amount);

    PaymentStatusResponse checkPaymentStatus(String billCode);

    PaymentStatusResponse processWebhook(BankWebhookPayload payload);

    PaymentStatusResponse simulatePayment(String billCode, BigDecimal amount);
}
