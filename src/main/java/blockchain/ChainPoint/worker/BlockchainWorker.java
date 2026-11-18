package blockchain.ChainPoint.worker;

import blockchain.ChainPoint.config.RabbitMQConfig;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.event.CheckoutWeb3Event;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.service.BlockchainService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlockchainWorker {

    private final BlockchainService blockchainService;
    private final BillRepository billRepository;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_NAME)
    public void handleCheckoutEvent(CheckoutWeb3Event event) {
        if (event == null) {
            log.warn("Received a null checkout Web3 event; routing to dead letter queue");
            throw new AmqpRejectAndDontRequeueException("Checkout Web3 event is null");
        }

        if (!StringUtils.hasText(event.getBillCode())) {
            log.warn("Checkout Web3 event has no billCode; routing to dead letter queue");
            throw new AmqpRejectAndDontRequeueException("Checkout Web3 event has no billCode");
        }

        try {
            log.info(
                    "Processing checkout Web3 event for billCode={}, pointsEarned={}, pointsUsed={}",
                    event.getBillCode(),
                    event.getPointsEarned(),
                    event.getPointsUsed()
            );

            String invoiceTxHash = blockchainService.recordInvoice(
                    event.getBillCode(),
                    event.getBranchId(),
                    event.getFinalAmount(),
                    event.getBillHash()
            );
            updateBillHashes(event.getBillCode(), invoiceTxHash, null);

            if (event.getPointsUsed() != null && event.getPointsUsed() > 0
                    && StringUtils.hasText(event.getCustomerPhone())) {
                String redeemTxHash = blockchainService.redeemPoints(
                        event.getCustomerPhone(),
                        event.getPointsUsed(),
                        event.getBillCode()
                );
                updateBillHashes(event.getBillCode(), null, redeemTxHash);
            }

            if (event.getPointsEarned() != null && event.getPointsEarned() > 0
                    && StringUtils.hasText(event.getCustomerPhone())) {
                String loyaltyTxHash = blockchainService.earnPoints(
                        event.getWalletAddress(),
                        event.getCustomerPhone(),
                        event.getPointsEarned(),
                        event.getBillCode(),
                        event.getFinalAmount()
                );
                updateBillHashes(event.getBillCode(), null, loyaltyTxHash);
            }

            log.info("Finished processing checkout Web3 event for billCode={}", event.getBillCode());
        } catch (Exception exception) {
            log.error(
                    "Failed to process checkout Web3 event for billCode={}; routing to dead letter queue",
                    event.getBillCode(),
                    exception
            );
            throw new AmqpRejectAndDontRequeueException(
                    "Failed to process checkout event for bill " + event.getBillCode(),
                    exception
            );
        }
    }

    private void updateBillHashes(String billCode, String invoiceTxHash, String loyaltyTxHash) {
        if (invoiceTxHash == null && loyaltyTxHash == null) {
            return;
        }

        Bill bill = billRepository.findByBillCode(billCode).orElse(null);
        if (bill == null) {
            log.warn("Bill not found for billCode={}; cannot persist blockchain transaction hashes", billCode);
            return;
        }

        if (StringUtils.hasText(invoiceTxHash)) {
            bill.setBlockchainTxHash(invoiceTxHash);
        }

        if (StringUtils.hasText(loyaltyTxHash)) {
            bill.setLoyaltyTxHash(loyaltyTxHash);
        }

        billRepository.save(bill);
        log.info(
                "Persisted blockchain hashes for billCode={} (invoice={}, loyalty={})",
                billCode,
                bill.getBlockchainTxHash(),
                bill.getLoyaltyTxHash()
        );
    }
}
