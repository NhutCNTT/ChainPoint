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
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "blockchain.enabled", havingValue = "true")
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

            Bill existing = billRepository.findByBillCode(event.getBillCode())
                    .orElseThrow(() -> new IllegalStateException("Bill is not committed yet"));
            if (!StringUtils.hasText(existing.getBlockchainTxHash())) {
                String invoiceTxHash = blockchainService.recordInvoice(
                    event.getBillCode(),
                    event.getBranchId(),
                    event.getFinalAmount(),
                    event.getBillHash()
            );
            updateBillHash(event.getBillCode(), invoiceTxHash, "invoice");
            }

            if (event.getPointsUsed() != null && event.getPointsUsed() > 0
                    && StringUtils.hasText(event.getCustomerPhone())
                    && !StringUtils.hasText(existing.getRedeemTxHash())) {
                String redeemTxHash = blockchainService.redeemPoints(
                        event.getWalletAddress(),
                        event.getCustomerPhone(),
                        event.getPointsUsed(),
                        event.getBillCode(),
                        event.getDiscountAmount() != null ? event.getDiscountAmount() : existing.getDiscountAmount()
                );
                updateBillHash(event.getBillCode(), redeemTxHash, "redeem");
            }

            if (event.getPointsEarned() != null && event.getPointsEarned() > 0
                    && StringUtils.hasText(event.getCustomerPhone())
                    && !StringUtils.hasText(existing.getEarnTxHash())) {
                String loyaltyTxHash = blockchainService.earnPoints(
                        event.getWalletAddress(),
                        event.getCustomerPhone(),
                        event.getPointsEarned(),
                        event.getBillCode(),
                        event.getFinalAmount()
                );
                updateBillHash(event.getBillCode(), loyaltyTxHash, "earn");
            }

            Bill current = billRepository.findByBillCode(event.getBillCode()).orElseThrow();
            if ("refunded".equals(current.getStatus()) && !StringUtils.hasText(current.getRefundTxHash())) {
                String refundTx = blockchainService.refundOrder(current.getBillCode(), event.getWalletAddress(),
                        current.getCustomerPhone(), current.getPointsUsed(), current.getPointsEarned(),
                        current.getFinalAmount(), current.getRefundReason());
                updateBillHash(current.getBillCode(), refundTx, "refund");
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

    private void updateBillHash(String billCode, String txHash, String stage) {
        if (!StringUtils.hasText(txHash)) throw new IllegalStateException("Missing confirmed transaction hash");
        Bill bill = billRepository.findByBillCode(billCode).orElseThrow();
        switch (stage) {
            case "invoice" -> bill.setBlockchainTxHash(txHash);
            case "redeem" -> { bill.setRedeemTxHash(txHash); bill.setLoyaltyTxHash(txHash); }
            case "earn" -> { bill.setEarnTxHash(txHash); bill.setLoyaltyTxHash(txHash); }
            case "refund" -> bill.setRefundTxHash(txHash);
            default -> throw new IllegalArgumentException("Unknown blockchain stage");
        }
        billRepository.save(bill);
    }
}
