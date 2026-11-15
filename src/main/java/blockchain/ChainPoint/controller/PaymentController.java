package blockchain.ChainPoint.controller;

import blockchain.ChainPoint.dto.payment.BankWebhookPayload;
import blockchain.ChainPoint.dto.payment.PaymentStatusResponse;
import blockchain.ChainPoint.dto.payment.VietQRInfoResponse;
import blockchain.ChainPoint.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payment")
@CrossOrigin
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/vietqr-info")
    public ResponseEntity<VietQRInfoResponse> getVietQRInfo(
            @RequestParam(required = false) String billCode,
            @RequestParam(required = false) BigDecimal amount
    ) {
        return ResponseEntity.ok(paymentService.generateVietQRInfo(billCode, amount));
    }

    @GetMapping("/status/{billCode}")
    public ResponseEntity<PaymentStatusResponse> getPaymentStatus(@PathVariable String billCode) {
        return ResponseEntity.ok(paymentService.checkPaymentStatus(billCode));
    }

    @PostMapping("/webhook")
    public ResponseEntity<PaymentStatusResponse> handleBankWebhook(@RequestBody BankWebhookPayload payload) {
        return ResponseEntity.ok(paymentService.processWebhook(payload));
    }

    @PostMapping("/simulate")
    public ResponseEntity<PaymentStatusResponse> simulatePayment(
            @RequestBody Map<String, Object> body
    ) {
        String billCode = (String) body.get("billCode");
        BigDecimal amount = null;
        if (body.get("amount") != null) {
            amount = new BigDecimal(body.get("amount").toString());
        }
        return ResponseEntity.ok(paymentService.simulatePayment(billCode, amount));
    }
}
