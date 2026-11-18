package blockchain.ChainPoint.service;

import blockchain.ChainPoint.config.Web3Config;
import blockchain.ChainPoint.exception.BlockchainTransactionException;
import blockchain.ChainPoint.web3.RestaurantLoyaltyFunctions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.Transaction;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.protocol.exceptions.TransactionException;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.response.PollingTransactionReceiptProcessor;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.List;

@Service
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "blockchain.enabled", havingValue = "true")
@RequiredArgsConstructor
public class BlockchainServiceImpl implements BlockchainService {

    private static final long RECEIPT_POLLING_INTERVAL_MS = 3_000L;
    private static final int RECEIPT_POLLING_ATTEMPTS = 60;

    private final Web3j web3j;
    private final Credentials credentials;
    private final ContractGasProvider gasProvider;
    private final Web3Config web3Config;

    @Override
    public String earnPoints(
            String customerAddress,
            String phoneNumber,
            long points,
            String orderCode,
            BigDecimal billAmount
    ) {
        Function function = RestaurantLoyaltyFunctions.earnPoints(
                customerAddress,
                phoneNumber,
                points,
                orderCode,
                billAmount
        );

        return execute(function);
    }

    @Override
    public String recordInvoice(
            String billCode,
            long branchId,
            BigDecimal netAmount,
            String invoiceHash
    ) {
        Function function = RestaurantLoyaltyFunctions.recordInvoice(
                billCode,
                branchId,
                netAmount,
                invoiceHash
        );

        return execute(function);
    }

    @Override
    public String redeemPoints(String customerAddress, String phoneNumber, long points, String orderCode, BigDecimal discountAmount) {
        Function function = RestaurantLoyaltyFunctions.redeemPoints(
                customerAddress,
                phoneNumber,
                points,
                orderCode,
                discountAmount
        );

        return execute(function);
    }

    @Override
    public Long getPointsByPhone(String phoneNumber) {
        Function function = RestaurantLoyaltyFunctions.getPointsByPhone(phoneNumber);

        Transaction transaction = Transaction.createEthCallTransaction(
                credentials.getAddress(),
                web3Config.getContractAddress(),
                RestaurantLoyaltyFunctions.encode(function)
        );

        try {
            EthCall response = web3j.ethCall(transaction, DefaultBlockParameterName.LATEST).send();

            if (response.hasError()) {
                throw new BlockchainTransactionException(
                        "Unable to read loyalty points: " + response.getError().getMessage()
                );
            }

            if (response.isReverted()) {
                throw new BlockchainTransactionException(
                        "Loyalty points call reverted: " + response.getRevertReason()
                );
            }

            List<Type> output = FunctionReturnDecoder.decode(
                    response.getValue(),
                    function.getOutputParameters()
            );

            if (output.isEmpty() || !(output.get(0) instanceof Uint256 points)) {
                throw new BlockchainTransactionException("Loyalty points call returned no value");
            }

            return points.getValue().longValue();
        } catch (IOException exception) {
            throw new BlockchainTransactionException("Unable to read loyalty points from the blockchain", exception);
        }
    }

    private String execute(Function function) {
        if (web3Config.getMasterWalletPrivateKey() == null || web3Config.getMasterWalletPrivateKey().isBlank()
                || web3Config.getContractAddress() == null
                || web3Config.getContractAddress().matches("(?i)0x0{40}")) {
            throw new BlockchainTransactionException("Configure a funded signing key and deployed loyalty contract before syncing");
        }
        String encodedFunction = RestaurantLoyaltyFunctions.encode(function);

        try {
            RawTransactionManager transactionManager = new RawTransactionManager(
                    web3j,
                    credentials,
                    resolveChainId()
            );

            EthSendTransaction response = transactionManager.sendTransaction(
                    gasProvider.getGasPrice(),
                    gasProvider.getGasLimit(),
                    web3Config.getContractAddress(),
                    encodedFunction,
                    BigInteger.ZERO
            );

            if (response.hasError()) {
                throw new BlockchainTransactionException(
                        "EVM transaction submission failed: " + response.getError().getMessage()
                );
            }

            String transactionHash = response.getTransactionHash();
            if (transactionHash == null || transactionHash.isBlank()) {
                throw new BlockchainTransactionException("EVM transaction returned no transaction hash");
            }

            TransactionReceipt receipt = new PollingTransactionReceiptProcessor(
                    web3j,
                    RECEIPT_POLLING_INTERVAL_MS,
                    RECEIPT_POLLING_ATTEMPTS
            ).waitForTransactionReceipt(transactionHash);

            if (!receipt.isStatusOK()) {
                throw new BlockchainTransactionException(
                        "EVM transaction reverted: " + transactionHash
                                + (receipt.getRevertReason() != null
                                ? " (" + receipt.getRevertReason() + ")"
                                : "")
                );
            }

            return transactionHash;
        } catch (IOException | TransactionException exception) {
            throw new BlockchainTransactionException(
                    "Failed to execute " + function.getName() + " transaction",
                    exception
            );
        }
    }

    private long resolveChainId() {
        Long configured = web3Config.getChainId();
        return configured != null ? configured : 11_155_111L;
    }
}
