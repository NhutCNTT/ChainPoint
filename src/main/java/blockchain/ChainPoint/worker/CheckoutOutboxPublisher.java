package blockchain.ChainPoint.worker;

import blockchain.ChainPoint.config.RabbitMQConfig;
import blockchain.ChainPoint.event.CheckoutWeb3Event;
import blockchain.ChainPoint.repository.CheckoutOutboxRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Component @RequiredArgsConstructor @Slf4j
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "blockchain.enabled", havingValue = "true")
public class CheckoutOutboxPublisher {
    private final CheckoutOutboxRepository repository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelayString = "${blockchain.outbox-delay-ms:5000}", initialDelay = 5000)
    @Transactional
    public void publish() {
        for (var entry : repository.findFirst20ByPublishedAtIsNullOrderByIdAsc()) {
            try {
                var event = objectMapper.readValue(entry.getPayload(), CheckoutWeb3Event.class);
                rabbitTemplate.invoke(operations -> {
                    operations.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY, event);
                    operations.waitForConfirmsOrDie(5000);
                    return null;
                });
                entry.setPublishedAt(LocalDateTime.now());
            } catch (Exception exception) {
                log.warn("Checkout event {} remains in the outbox for retry: {}", entry.getId(), exception.getMessage());
                break;
            }
        }
    }
}
