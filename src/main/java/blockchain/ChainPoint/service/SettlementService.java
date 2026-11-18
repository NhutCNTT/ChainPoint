package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.pos.CheckoutRequest;
import blockchain.ChainPoint.entity.*;
import blockchain.ChainPoint.event.BillPaidEvent;
import blockchain.ChainPoint.exception.InvalidRedemptionException;
import blockchain.ChainPoint.repository.*;
import blockchain.ChainPoint.security.BranchAccess;
import blockchain.ChainPoint.util.HashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class SettlementService {
    private final CustomerRepository customers;
    private final LoyaltyConfigRepository configs;
    private final DiningTableRepository tables;
    private final BranchAccess access;
    private final ApplicationEventPublisher events;
    private final BillRepository bills;

    @org.springframework.beans.factory.annotation.Value("${payment.webhook-secret:}")
    private String webhookSecret;

    public void prepare(Bill bill, CheckoutRequest request) {
        access.check(bill.getBranch().getId());
        String method = request.getPaymentMethod();
        if (!"cash".equals(method) && !"transfer".equals(method)) throw new IllegalArgumentException("Unsupported payment method");
        if ("paid".equals(bill.getStatus()) || "pending".equals(bill.getStatus())) {
            if (!Objects.equals(method, bill.getPaymentMethod()) || !Objects.equals(normalize(request.getCustomerPhone()), normalize(bill.getCustomerPhone()))
                    || !Objects.equals(request.getPointsToUse() == null ? 0L : request.getPointsToUse(), bill.getPointsUsed())) throw new IllegalArgumentException("Existing payment cannot be changed");
            return;
        }
        if (!"open".equals(bill.getStatus())) throw new IllegalArgumentException("Order cannot be paid in this state");
        if ("transfer".equals(method) && (webhookSecret == null || webhookSecret.isBlank())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Verified bank payment integration is not configured");
        }
        Customer customer = customer(normalize(request.getCustomerPhone()));
        if (customer != null) access.check(customer.getBranch() == null ? null : customer.getBranch().getId());
        LoyaltyConfig cfg = configs.findById(1L).orElseGet(() -> LoyaltyConfig.builder().id(1L).build());
        long points = request.getPointsToUse() == null ? 0 : request.getPointsToUse();
        if (points < 0) throw new InvalidRedemptionException("Points cannot be negative");
        BigDecimal discount = BigDecimal.valueOf(points).multiply(BigDecimal.valueOf(cfg.getPointValueVnd()));
        BigDecimal max = bill.getGrossAmount().multiply(BigDecimal.valueOf(cfg.getMaxDiscountPercent())).divide(BigDecimal.valueOf(100), 2, RoundingMode.DOWN);
        if (points > 0 && (!Boolean.TRUE.equals(cfg.getAllowRedeem()) || customer == null || points < cfg.getMinPointsToRedeem()
                || points > customer.getPoints() - bills.reservedPoints(customer.getPhone()) || discount.compareTo(max) > 0)) throw new InvalidRedemptionException("Requested loyalty redemption is not eligible");
        BigDecimal due = bill.getGrossAmount().subtract(discount).setScale(2, RoundingMode.HALF_UP);
        if ("cash".equals(method) && (request.getCashReceived() == null || request.getCashReceived().compareTo(due) < 0)) throw new IllegalArgumentException("Cash received must cover the server-calculated amount");
        bill.setCustomerPhone(customer == null ? null : customer.getPhone()); bill.setPaymentMethod(method); bill.setPointsUsed(points);
        bill.setDiscountAmount(discount); bill.setFinalAmount(due);
        if ("cash".equals(method)) bill.setCashReceived(request.getCashReceived());
        bill.setPointsEarned(customer != null && Boolean.TRUE.equals(cfg.getAllowEarn()) ? due.divideToIntegralValue(BigDecimal.valueOf(cfg.getEarnRatioVnd())).longValueExact() : 0L);
        // Reserve redemption under the customer lock; earnings and spend await settlement.
        bill.setRedemptionReserved(true);
        bill.setStatus("pending");
        if ("cash".equals(method)) settle(bill, customer);
        else tables.findByCodeAndBranchId(bill.getTableCode(), bill.getBranch().getId()).ifPresent(t -> t.setStatus("pending"));
    }

    /** Called only after provider signature, reference, amount and pending method verification. */
    public void confirmTransfer(Bill bill) {
        if ("paid".equals(bill.getStatus())) return;
        if (!"pending".equals(bill.getStatus()) || !"transfer".equals(bill.getPaymentMethod())) throw new IllegalArgumentException("No pending transfer");
        settle(bill, customer(bill.getCustomerPhone()));
    }

    private void settle(Bill bill, Customer customer) {
        if (customer != null) {
            if (Boolean.TRUE.equals(bill.getRedemptionReserved())) {
                if (customer.getPoints() < bill.getPointsUsed()) throw new InvalidRedemptionException("Insufficient points at settlement");
                customer.setPoints(customer.getPoints() - bill.getPointsUsed());
            }
            customer.setPoints(customer.getPoints() + bill.getPointsEarned());
            BigDecimal spend = customer.getTotalSpent().add(bill.getFinalAmount()); customer.setTotalSpent(spend);
            customer.setTier(spend.compareTo(new BigDecimal("20000000")) >= 0 ? "Kim Cương" : spend.compareTo(new BigDecimal("5000000")) >= 0 ? "Vàng" : "Bạc");
        }
        bill.setStatus("paid"); bill.setPaidAt(LocalDateTime.now()); bill.setBlockchainPending(true);
        bill.setBillHash(HashUtil.generateBillHash(bill.getBillCode(), bill.getBranch().getId(), bill.getFinalAmount(), bill.getCreatedAt() == null ? LocalDateTime.now() : bill.getCreatedAt()));
        tables.findByCodeAndBranchId(bill.getTableCode(), bill.getBranch().getId()).ifPresent(t -> t.setStatus("active"));
        events.publishEvent(new BillPaidEvent(bill.getBillCode()));
    }

    public void releaseReservedPoints(Bill bill) {
        if (!"pending".equals(bill.getStatus()) || Boolean.TRUE.equals(bill.getRedemptionReserved())) return;
        Customer customer = customer(bill.getCustomerPhone());
        if (customer != null) customer.setPoints(customer.getPoints() + bill.getPointsUsed());
    }
    private Customer customer(String phone) {
        if (phone == null) return null;
        var matches = customers.findPhoneVariantsForUpdate(blockchain.ChainPoint.util.VietnamPhone.variants(phone));
        if (matches.size() > 1) throw new InvalidRedemptionException("Duplicate legacy phone records require review");
        if (matches.isEmpty()) throw new InvalidRedemptionException("Registered customer not found");
        return matches.getFirst();
    }
    private String normalize(String value) { return value == null || value.isBlank() ? null : blockchain.ChainPoint.util.VietnamPhone.normalize(value); }
}
