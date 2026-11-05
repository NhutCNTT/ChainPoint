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

    public static final String QUEUE_NAME = "blockchain.loyalty.queue";
    public static final String EXCHANGE_NAME = "chainpoint.event.exchange";
    public static final String ROUTING_KEY = "chainpoint.checkout.success";

    @Bean
    public Queue loyaltyQueue() {
        return QueueBuilder.durable(QUEUE_NAME).build();
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
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
