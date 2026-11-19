package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.payment.PaymentStatusResponse;
import blockchain.ChainPoint.dto.payment.VietQrInfoResponse;

import java.math.BigDecimal;

public interface PaymentService {

    VietQrInfoResponse getVietQrInfo(String billCode, BigDecimal amount);

    PaymentStatusResponse getStatus(String billCode);

    PaymentStatusResponse confirm(blockchain.ChainPoint.dto.payment.ProviderConfirmation request, String signature);
}
