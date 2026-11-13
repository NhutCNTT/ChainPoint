package blockchain.ChainPoint.config;

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.ECKeyPair;
import org.web3j.crypto.Keys;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.StaticGasProvider;

import java.math.BigInteger;

@Slf4j
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "blockchain")
public class Web3Config {

    private static final BigInteger GAS_PRICE = BigInteger.valueOf(20_000_000_000L);
    private static final long DEFAULT_GAS_LIMIT = 300_000L;

    private String rpcUrl;

    private String contractAddress;

    private String masterWalletPrivateKey;

    private Long gasLimit = DEFAULT_GAS_LIMIT;

    @Bean(destroyMethod = "shutdown")
    public Web3j web3j() {
        return Web3j.build(new HttpService(rpcUrl));
    }

    @Bean
    public Credentials credentials() {
        String privateKey = normalizePrivateKey(masterWalletPrivateKey);

        if (privateKey == null) {
            try {
                ECKeyPair keyPair = Keys.createEcKeyPair();
                Credentials credentials = Credentials.create(keyPair);
                log.warn(
                        "blockchain.master-wallet-private-key is not configured; "
                                + "using ephemeral wallet {} for this application instance",
                        credentials.getAddress()
                );
                return credentials;
            } catch (Exception exception) {
                throw new IllegalStateException("Unable to create ephemeral Web3 credentials", exception);
            }
        }

        return Credentials.create(privateKey);
    }

    @Bean
    public ContractGasProvider gasProvider() {
        long limit = gasLimit != null ? gasLimit : DEFAULT_GAS_LIMIT;
        return new StaticGasProvider(GAS_PRICE, BigInteger.valueOf(limit));
    }

    private String normalizePrivateKey(String privateKey) {
        if (privateKey == null || privateKey.isBlank()) {
            return null;
        }

        String normalized = privateKey.trim();
        if (normalized.startsWith("0x") || normalized.startsWith("0X")) {
            normalized = normalized.substring(2);
        }

        return normalized.isEmpty() ? null : normalized;
    }
}
