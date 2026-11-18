package blockchain.ChainPoint.service;

import java.math.BigDecimal;

public interface BlockchainService {

    String earnPoints(
            String customerAddress,
            String phoneNumber,
            long points,
            String orderCode,
            BigDecimal billAmount
    );

    String recordInvoice(
            String billCode,
            long branchId,
            BigDecimal netAmount,
            String invoiceHash
    );

    String redeemPoints(String customerAddress, String phoneNumber, long points, String orderCode, BigDecimal discountAmount);

    Long getPointsByPhone(String phoneNumber);

    String refundOrder(String orderCode, String customerAddress, String phoneNumber,
            long pointsRestored, long pointsRevoked, BigDecimal refundAmount, String reason);
}
