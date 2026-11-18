package blockchain.ChainPoint.controller;

import blockchain.ChainPoint.dto.order.OrderResponse;
import blockchain.ChainPoint.dto.order.RefundRequest;
import blockchain.ChainPoint.dto.order.RefundResponse;
import blockchain.ChainPoint.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/orders")
@CrossOrigin
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<List<OrderResponse>> getOrders(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        return ResponseEntity.ok(orderService.getOrders(branchId, status, from, to));
    }

    @GetMapping("/{billCode}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable String billCode) {
        return ResponseEntity.ok(orderService.getOrder(billCode));
    }

    @PostMapping("/{billCode}/refund")
    @PreAuthorize("hasAnyRole('OWNER', 'MANAGER')")
    public ResponseEntity<RefundResponse> refundOrder(
            @PathVariable String billCode,
            @Valid @RequestBody(required = false) RefundRequest request,
            Authentication authentication
    ) {
        String processedBy = authentication != null ? authentication.getName() : "manager";
        return ResponseEntity.ok(orderService.refundOrder(billCode, request, processedBy));
    }
}
