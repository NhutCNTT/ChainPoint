package blockchain.ChainPoint.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidRedemptionException extends RuntimeException {

    public InvalidRedemptionException(String message) {
        super(message);
    }
}
