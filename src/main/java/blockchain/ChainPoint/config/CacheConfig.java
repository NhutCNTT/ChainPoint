package blockchain.ChainPoint.config;

import org.springframework.context.annotation.*;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.*;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.Duration;

@Configuration
public class CacheConfig {
    @Bean
    RedisCacheConfiguration redisCacheConfiguration(
            @org.springframework.beans.factory.annotation.Value("${spring.cache.redis.key-prefix:chainpoint:v2:}") String prefix) {
        var serializer = new GenericJackson2JsonRedisSerializer()
                .configure(mapper -> mapper.registerModule(new JavaTimeModule()));
        return RedisCacheConfiguration.defaultCacheConfig()
                .computePrefixWith(name -> prefix + name + "::")
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues()
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer));
    }
}
