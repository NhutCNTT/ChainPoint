package blockchain.ChainPoint.worker;

import blockchain.ChainPoint.config.RabbitMQConfig;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.event.CheckoutWeb3Event;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.service.BlockchainService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlockchainWorker {

    private final BlockchainService blockchainService;
    private final BillRepository billRepository;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_NAME)
    public void handleCheckoutEvent(CheckoutWeb3Event event) {
        if (event == null) {
            log.warn("Received a null checkout Web3 event; ignoring");
            return;
        }

        try {
            log.info(
                    "Processing checkout Web3 event for billCode={}, pointsEarned={}",
                    event.getBillCode(),
                    event.getPointsEarned()
            );

            String transactionHash = blockchainService.recordInvoice(
                    event.getBillCode(),
                    event.getBranchId(),
                    event.getFinalAmount(),
                    event.getBillHash()
            );

            if (event.getPointsEarned() != null && event.getPointsEarned() > 0) {
                transactionHash = blockchainService.earnPoints(
                        event.getWalletAddress(),
                        event.getCustomerPhone(),
                        event.getPointsEarned(),
                        event.getBillCode(),
                        event.getFinalAmount()
                );
            }

            updateBillTransactionHash(event.getBillCode(), transactionHash);
        } catch (Exception exception) {
            log.error(
                    "Failed to process checkout Web3 event for billCode={}",
                    event.getBillCode(),
                    exception
            );
        }
    }

    private void updateBillTransactionHash(String billCode, String transactionHash) {
        if (billCode == null || billCode.isBlank()) {
            log.warn("Checkout Web3 event has no billCode; cannot persist blockchain transaction hash");
            return;
        }

        Bill bill = billRepository.findByBillCode(billCode).orElse(null);
        if (bill == null) {
            log.warn("Bill not found for billCode={}; cannot persist blockchain transaction hash", billCode);
            return;
        }

        bill.setBlockchainTxHash(transactionHash);
        billRepository.save(bill);

        log.info("Persisted blockchain transaction hash {} for billCode={}", transactionHash, billCode);
    }
}
