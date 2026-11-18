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

    Long getPointsByPhone(String phoneNumber);
}
