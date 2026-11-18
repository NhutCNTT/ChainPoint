package blockchain.ChainPoint.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Configuration;

/** Cache outages must not turn a committed database write into a reported business failure. */
@Configuration @Slf4j
public class CacheResilienceConfig implements CachingConfigurer {
    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            private void report(Cache cache) { log.warn("Cache {} unavailable; database remains authoritative", cache.getName()); }
            public void handleCacheGetError(RuntimeException error, Cache cache, Object key) { report(cache); }
            public void handleCachePutError(RuntimeException error, Cache cache, Object key, Object value) { report(cache); }
            public void handleCacheEvictError(RuntimeException error, Cache cache, Object key) { report(cache); }
            public void handleCacheClearError(RuntimeException error, Cache cache) { report(cache); }
        };
    }
}
