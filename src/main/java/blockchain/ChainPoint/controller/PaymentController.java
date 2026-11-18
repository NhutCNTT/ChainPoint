package blockchain.ChainPoint.controller;

import blockchain.ChainPoint.dto.payment.PaymentStatusResponse;
import blockchain.ChainPoint.dto.payment.VietQrInfoResponse;
import blockchain.ChainPoint.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/v1/payment")
@CrossOrigin
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/vietqr-info")
    public ResponseEntity<VietQrInfoResponse> getVietQrInfo(
            @RequestParam(required = false) String billCode,
            @RequestParam(required = false) BigDecimal amount
    ) {
        return ResponseEntity.ok(paymentService.getVietQrInfo(billCode, amount));
    }

    @GetMapping("/status/{billCode}")
    public ResponseEntity<PaymentStatusResponse> getStatus(@PathVariable String billCode) {
        return ResponseEntity.ok(paymentService.getStatus(billCode));
    }

    @PostMapping("/provider-confirmation")
    public ResponseEntity<PaymentStatusResponse> confirm(
            @Valid @RequestBody blockchain.ChainPoint.dto.payment.ProviderConfirmation request,
            @org.springframework.web.bind.annotation.RequestHeader("X-Payment-Signature") String signature
    ) {
        return ResponseEntity.ok(paymentService.confirm(request, signature));
    }
}
