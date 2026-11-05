package blockchain.ChainPoint.controller;

import blockchain.ChainPoint.dto.pos.CheckoutRequest;
import blockchain.ChainPoint.dto.pos.CheckoutResponse;
import blockchain.ChainPoint.service.CheckoutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/pos")
@CrossOrigin
@RequiredArgsConstructor
public class PosController {

    private final CheckoutService checkoutService;

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(
            @Valid @RequestBody CheckoutRequest request
    ) {
        return ResponseEntity.ok(checkoutService.processCheckout(request));
    }
}
