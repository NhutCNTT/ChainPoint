package blockchain.ChainPoint.web3;

import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint256;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;

public final class RestaurantLoyaltyFunctions {

    private static final String ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    private static final int INVOICE_HASH_LENGTH = 64;
    private static final HexFormat HEX_FORMAT = HexFormat.of();

    private RestaurantLoyaltyFunctions() {
    }

    public static Function earnPoints(
            String customerAddress,
            String phoneNumber,
            long points,
            String orderCode,
            BigDecimal billAmount
    ) {
        List<Type> inputParameters = Arrays.asList(
                new Address(normalizeAddress(customerAddress)),
                new Utf8String(phoneNumber),
                new Uint256(BigInteger.valueOf(points)),
                new Utf8String(orderCode),
                new Uint256(billAmount.toBigInteger())
        );

        return new Function("earnPoints", inputParameters, Collections.emptyList());
    }

    public static Function recordInvoice(
            String billCode,
            long branchId,
            BigDecimal netAmount,
            String invoiceHash
    ) {
        List<Type> inputParameters = Arrays.asList(
                new Utf8String(billCode),
                new Uint256(BigInteger.valueOf(branchId)),
                new Uint256(netAmount.toBigInteger()),
                new Bytes32(toBytes32(invoiceHash))
        );

        return new Function("recordInvoice", inputParameters, Collections.emptyList());
    }

    public static Function getPointsByPhone(String phoneNumber) {
        List<Type> inputParameters = Collections.singletonList(new Utf8String(phoneNumber));
        List<TypeReference<?>> outputParameters = Collections.singletonList(
                new TypeReference<Uint256>() {
                }
        );

        return new Function("getPointsByPhone", inputParameters, outputParameters);
    }

    public static String encode(Function function) {
        return FunctionEncoder.encode(function);
    }

    private static String normalizeAddress(String walletAddress) {
        if (walletAddress == null || walletAddress.isBlank()) {
            return ZERO_ADDRESS;
        }

        return walletAddress.trim();
    }

    private static byte[] toBytes32(String invoiceHash) {
        if (invoiceHash == null || invoiceHash.length() != INVOICE_HASH_LENGTH) {
            throw new IllegalArgumentException("Invoice hash must be a 64-character hexadecimal string");
        }

        return HEX_FORMAT.parseHex(invoiceHash);
    }
}
