package blockchain.ChainPoint.service;

import blockchain.ChainPoint.config.RabbitMQConfig;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.event.*;
import blockchain.ChainPoint.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

/** Paid bills retain a durable delivery marker until the worker completes synchronization. */
@Service @RequiredArgsConstructor @Slf4j
public class BlockchainDeliveryService {
    private final BillRepository bills;
    private final CustomerRepository customers;
    private final RabbitTemplate rabbit;

    @TransactionalEventListener
    public void afterPayment(BillPaidEvent event) {
        // The scheduled transaction reads committed data and retries unavailable brokers.
        log.debug("Blockchain delivery queued for {}", event.billCode());
    }

    @Scheduled(fixedDelayString = "${blockchain.delivery-delay-ms:30000}", initialDelayString = "${blockchain.delivery-delay-ms:30000}")
    @Transactional(readOnly = true)
    public void retryPending() {
        for (Bill bill : bills.findByBlockchainPendingTrueAndStatus("paid")) {
            var customer = bill.getCustomerPhone() == null ? null : customers.findByPhone(bill.getCustomerPhone()).orElse(null);
            var event = CheckoutWeb3Event.builder().billCode(bill.getBillCode()).branchId(bill.getBranch().getId())
                    .customerPhone(bill.getCustomerPhone()).walletAddress(customer == null ? null : customer.getWalletAddress())
                    .pointsEarned(bill.getPointsEarned()).pointsUsed(bill.getPointsUsed()).discountAmount(bill.getDiscountAmount())
                    .finalAmount(bill.getFinalAmount()).billHash(bill.getBillHash()).timestamp(bill.getCreatedAt()).build();
            try { rabbit.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY, event); }
            catch (Exception exception) { log.warn("Blockchain delivery deferred for {}; broker unavailable", bill.getBillCode()); break; }
        }
    }
}
