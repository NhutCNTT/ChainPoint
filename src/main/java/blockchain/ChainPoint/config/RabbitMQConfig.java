package blockchain.ChainPoint.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Queue arguments are immutable in RabbitMQ. Version this topology rather than deleting a legacy queue.
    public static final String QUEUE_NAME = "blockchain.loyalty.v2.queue";
    public static final String EXCHANGE_NAME = "chainpoint.event.exchange";
    public static final String ROUTING_KEY = "chainpoint.checkout.v2.success";

    public static final String DEAD_LETTER_QUEUE_NAME = "blockchain.loyalty.dlq";
    public static final String DEAD_LETTER_EXCHANGE_NAME = "chainpoint.event.dlx";
    public static final String DEAD_LETTER_ROUTING_KEY = "chainpoint.checkout.dead";

    @Bean
    public Queue loyaltyQueue() {
        return QueueBuilder.durable(QUEUE_NAME)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE_NAME)
                .withArgument("x-dead-letter-routing-key", DEAD_LETTER_ROUTING_KEY)
                .build();
    }

    @Bean
    public DirectExchange loyaltyExchange() {
        return new DirectExchange(EXCHANGE_NAME, true, false);
    }

    @Bean
    public Binding loyaltyBinding(Queue loyaltyQueue, DirectExchange loyaltyExchange) {
        return BindingBuilder.bind(loyaltyQueue)
                .to(loyaltyExchange)
                .with(ROUTING_KEY);
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DEAD_LETTER_QUEUE_NAME).build();
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE_NAME, true, false);
    }

    @Bean
    public Binding deadLetterBinding(Queue deadLetterQueue, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue)
                .to(deadLetterExchange)
                .with(DEAD_LETTER_ROUTING_KEY);
    }

    @Bean
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
