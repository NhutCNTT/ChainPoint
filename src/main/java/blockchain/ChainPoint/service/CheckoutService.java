package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.pos.CheckoutRequest;
import blockchain.ChainPoint.dto.pos.CheckoutResponse;

public interface CheckoutService {

    CheckoutResponse processCheckout(CheckoutRequest request);
}
