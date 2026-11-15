package blockchain.ChainPoint.controller;

import blockchain.ChainPoint.dto.order.OrderResponse;
import blockchain.ChainPoint.dto.order.RefundRequest;
import blockchain.ChainPoint.dto.order.RefundResponse;
import blockchain.ChainPoint.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
@CrossOrigin
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrders(
            @RequestParam(required = false) Long branchId
    ) {
        return ResponseEntity.ok(orderService.getOrders(branchId));
    }

    @GetMapping("/{billCode}")
    public ResponseEntity<OrderResponse> getOrderByCode(@PathVariable String billCode) {
        return ResponseEntity.ok(orderService.getOrderByCode(billCode));
    }

    @PostMapping("/{billCode}/refund")
    public ResponseEntity<RefundResponse> refundOrder(
            @PathVariable String billCode,
            @Valid @RequestBody(required = false) RefundRequest request
    ) {
        if (request == null) {
            request = new RefundRequest();
            request.setReason("Quản lý hoàn tiền trực tiếp");
        }
        return ResponseEntity.ok(orderService.refundOrder(billCode, request));
    }
}
