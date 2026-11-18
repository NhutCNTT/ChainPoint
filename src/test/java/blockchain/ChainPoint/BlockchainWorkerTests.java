package blockchain.ChainPoint;

import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.event.CheckoutWeb3Event;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.service.BlockchainService;
import blockchain.ChainPoint.worker.BlockchainWorker;
import blockchain.ChainPoint.web3.RestaurantLoyaltyFunctions;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import java.math.BigDecimal;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class BlockchainWorkerTests {
    @Mock BlockchainService blockchain;
    @Mock BillRepository bills;
    @InjectMocks BlockchainWorker worker;

    CheckoutWeb3Event event() {
        return CheckoutWeb3Event.builder().billCode("HD1").branchId(1L)
                .finalAmount(BigDecimal.valueOf(95000)).discountAmount(BigDecimal.valueOf(5000))
                .billHash("a".repeat(64)).build();
    }

    @Test void walkInNeverCallsLoyaltyAndKeepsInvoiceHash() {
        var bill = Bill.builder().billCode("HD1").build();
        when(bills.findByBillCode("HD1")).thenReturn(Optional.of(bill));
        when(blockchain.recordInvoice(anyString(), anyLong(), any(), anyString())).thenReturn("invoice");
        worker.handleCheckoutEvent(event());
        assertThat(bill.getBlockchainTxHash()).isEqualTo("invoice");
        verify(blockchain).recordInvoice(anyString(), anyLong(), any(), anyString());
        verifyNoMoreInteractions(blockchain);
    }

    @Test void redemptionAndEarningKeepSeparateHashesAndReplaySkipsConfirmedStages() {
        var bill = Bill.builder().billCode("HD1").build();
        var event = event(); event.setCustomerPhone("0900000000"); event.setPointsUsed(5L); event.setPointsEarned(9L);
        when(bills.findByBillCode("HD1")).thenReturn(Optional.of(bill));
        when(blockchain.recordInvoice(anyString(), anyLong(), any(), anyString())).thenReturn("invoice");
        when(blockchain.redeemPoints(isNull(), eq(event.getCustomerPhone()), eq(5L), eq("HD1"), any())).thenReturn("redeem");
        when(blockchain.earnPoints(isNull(), eq(event.getCustomerPhone()), eq(9L), eq("HD1"), any())).thenReturn("earn");
        worker.handleCheckoutEvent(event);
        worker.handleCheckoutEvent(event);
        assertThat(bill.getBlockchainTxHash()).isEqualTo("invoice");
        assertThat(bill.getRedeemTxHash()).isEqualTo("redeem");
        assertThat(bill.getEarnTxHash()).isEqualTo("earn");
        verify(blockchain, times(1)).recordInvoice(anyString(), anyLong(), any(), anyString());
        verify(blockchain, times(1)).redeemPoints(any(), anyString(), anyLong(), anyString(), any());
        verify(blockchain, times(1)).earnPoints(any(), anyString(), anyLong(), anyString(), any());
    }

    @Test void failureIsRejectedForDeadLetterRouting() {
        when(bills.findByBillCode("HD1")).thenReturn(Optional.of(Bill.builder().build()));
        when(blockchain.recordInvoice(anyString(), anyLong(), any(), anyString())).thenThrow(new IllegalStateException("RPC unavailable"));
        assertThatThrownBy(() -> worker.handleCheckoutEvent(event())).isInstanceOf(AmqpRejectAndDontRequeueException.class);
        assertThatThrownBy(() -> worker.handleCheckoutEvent(null)).isInstanceOf(AmqpRejectAndDontRequeueException.class);
    }

    @Test void redemptionAbiMatchesTheFiveSolidityArguments() {
        var function=RestaurantLoyaltyFunctions.redeemPoints(null, "0900000000", 5, "HD1", BigDecimal.valueOf(5000));
        assertThat(function.getInputParameters()).hasSize(5);
        assertThat(function.getInputParameters().stream().map(p -> p.getTypeAsString()).toList())
                .containsExactly("address", "string", "uint256", "string", "uint256");
        assertThat(RestaurantLoyaltyFunctions.encode(function)).startsWith("0x");
    }

    @Test void refundPreservesOriginalHashesAndIsSkippedWhenReplayed() {
        var bill = Bill.builder().billCode("HD1").status("refunded").blockchainTxHash("invoice")
                .earnTxHash("earn").redeemTxHash("redeem").pointsUsed(5L).pointsEarned(9L)
                .finalAmount(BigDecimal.valueOf(95000)).refundReason("Returned").build();
        when(bills.findByBillCode("HD1")).thenReturn(Optional.of(bill));
        when(blockchain.refundOrder(eq("HD1"), isNull(), isNull(), eq(5L), eq(9L), any(), eq("Returned")))
                .thenReturn("refund");
        worker.handleCheckoutEvent(event());
        worker.handleCheckoutEvent(event());
        assertThat(bill.getRefundTxHash()).isEqualTo("refund");
        assertThat(bill.getBlockchainTxHash()).isEqualTo("invoice");
        verify(blockchain, times(1)).refundOrder(anyString(), any(), any(), anyLong(), anyLong(), any(), anyString());
        verifyNoMoreInteractions(blockchain);
    }
}
