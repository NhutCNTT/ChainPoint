package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.order.OrderResponse;
import blockchain.ChainPoint.dto.order.RefundRequest;
import blockchain.ChainPoint.dto.order.RefundResponse;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderService {

    List<OrderResponse> getOrders(Long branchId, String status, LocalDateTime from, LocalDateTime to);

    OrderResponse getOrder(String billCode);

    RefundResponse refundOrder(String billCode, RefundRequest request, String processedBy);
}
