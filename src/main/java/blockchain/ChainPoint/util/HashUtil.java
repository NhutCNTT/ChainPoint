package blockchain.ChainPoint.util;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;

public final class HashUtil {

    private HashUtil() {
    }

    public static String generateBillHash(
            String billCode,
            Long branchId,
            BigDecimal finalAmount,
            LocalDateTime createdAt
    ) {
        String payload = billCode
                + ":"
                + branchId
                + ":"
                + finalAmount.toPlainString()
                + ":"
                + createdAt;

        try {
            MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
            byte[] digest = messageDigest.digest(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm is not available", exception);
        }
    }
}
