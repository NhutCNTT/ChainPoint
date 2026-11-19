package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.loyalty.LoyaltyConfigDto;
import blockchain.ChainPoint.dto.loyalty.LoyaltyTransactionResponse;
import blockchain.ChainPoint.entity.Bill;
import blockchain.ChainPoint.entity.Customer;
import blockchain.ChainPoint.entity.LoyaltyConfig;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.repository.CustomerRepository;
import blockchain.ChainPoint.repository.LoyaltyConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoyaltyServiceImpl implements LoyaltyService {

    private static final long CONFIG_ID = 1L;
    private static final String TYPE_EARN = "EARN";
    private static final String TYPE_REDEEM = "REDEEM";
    private static final String TYPE_REFUND = "REFUND";

    private final LoyaltyConfigRepository loyaltyConfigRepository;
    private final BillRepository billRepository;
    private final CustomerRepository customerRepository;
    private final blockchain.ChainPoint.security.BranchAccess access;

    @Override
    @Transactional
    public LoyaltyConfigDto getConfig() {
        return toDto(loadOrCreateConfig());
    }

    @Override
    @Transactional
    public LoyaltyConfigDto updateConfig(LoyaltyConfigDto request) {
        access.requireOwner();
        LoyaltyConfig config = loadOrCreateConfig();

        if (request.getEarnRatioVnd() != null) {
            config.setEarnRatioVnd(Math.max(1L, request.getEarnRatioVnd()));
        }
        if (request.getPointValueVnd() != null) {
            config.setPointValueVnd(Math.max(1L, request.getPointValueVnd()));
        }
        if (request.getMinPointsToRedeem() != null) {
            config.setMinPointsToRedeem(Math.max(1L, request.getMinPointsToRedeem()));
        }
        if (request.getMaxDiscountPercent() != null) {
            int percent = Math.max(1, Math.min(100, request.getMaxDiscountPercent()));
            config.setMaxDiscountPercent(percent);
        }
        if (request.getPointExpiryDays() != null) {
            config.setPointExpiryDays(Math.max(1, request.getPointExpiryDays()));
        }
        if (request.getAllowEarn() != null) {
            config.setAllowEarn(request.getAllowEarn());
        }
        if (request.getAllowRedeem() != null) {
            config.setAllowRedeem(request.getAllowRedeem());
        }

        return toDto(loyaltyConfigRepository.save(config));
    }

    @Override
    public List<LoyaltyTransactionResponse> getTransactions(Long branchId) {
        branchId = access.resolve(branchId);
        List<Bill> bills = billRepository.searchBills(branchId, null, null, null);
        List<LoyaltyTransactionResponse> transactions = new ArrayList<>();

        for (Bill bill : bills) {
            if (!"paid".equals(bill.getStatus()) && !"refunded".equals(bill.getStatus())) continue;
            Customer customer = StringUtils.hasText(bill.getCustomerPhone())
                    ? customerRepository.findByPhone(bill.getCustomerPhone()).orElse(null)
                    : null;

            long used = bill.getPointsUsed() != null ? bill.getPointsUsed() : 0L;
            long earned = bill.getPointsEarned() != null ? bill.getPointsEarned() : 0L;

            if (used > 0) {
                transactions.add(buildTransaction(
                        bill,
                        customer,
                        "RD-" + bill.getBillCode(),
                        TYPE_REDEEM,
                        -used,
                        "Áp dụng giảm trừ " + formatVnd(bill.getDiscountAmount()) + " ₫"
                ));
            }

            if (earned > 0) {
                transactions.add(buildTransaction(
                        bill,
                        customer,
                        "ER-" + bill.getBillCode(),
                        TYPE_EARN,
                        earned,
                        "Tích điểm từ đơn " + formatVnd(bill.getFinalAmount()) + " ₫"
                ));
            }

            if ("refunded".equalsIgnoreCase(bill.getStatus()) && (used > 0 || earned > 0)) {
                long delta = used - earned;
                if (delta != 0) {
                    transactions.add(buildTransaction(
                            bill,
                            customer,
                            "RF-" + bill.getBillCode(),
                            TYPE_REFUND,
                            delta,
                            "Cân đối điểm khi hoàn đơn #" + bill.getBillCode()
                    ));
                }
            }
        }

        return transactions.stream()
                .sorted(Comparator.comparing(
                        LoyaltyTransactionResponse::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    private LoyaltyConfig loadOrCreateConfig() {
        return loyaltyConfigRepository.findById(CONFIG_ID)
                .orElseGet(() -> loyaltyConfigRepository.save(
                        LoyaltyConfig.builder().id(CONFIG_ID).build()
                ));
    }

    private LoyaltyTransactionResponse buildTransaction(
            Bill bill,
            Customer customer,
            String txCode,
            String type,
            long pointsDelta,
            String note
    ) {
        return LoyaltyTransactionResponse.builder()
                .txCode(txCode)
                .customerId(customer != null ? customer.getId() : null)
                .customerCode(customer != null ? customer.getCode() : null)
                .customerName(customer != null
                        ? customer.getName()
                        : (StringUtils.hasText(bill.getCustomerPhone())
                        ? bill.getCustomerPhone()
                        : "Khách vãng lai"))
                .customerPhone(bill.getCustomerPhone())
                .type(type)
                .pointsDelta(pointsDelta)
                .billCode(bill.getBillCode())
                .cashierUsername(bill.getCashierUsername())
                .note(note)
                .createdAt(bill.getCreatedAt())
                .build();
    }

    private String formatVnd(BigDecimal amount) {
        BigDecimal value = amount != null ? amount : BigDecimal.ZERO;
        return String.format("%,.0f", value);
    }

    private LoyaltyConfigDto toDto(LoyaltyConfig config) {
        return LoyaltyConfigDto.builder()
                .earnRatioVnd(config.getEarnRatioVnd())
                .pointValueVnd(config.getPointValueVnd())
                .minPointsToRedeem(config.getMinPointsToRedeem())
                .maxDiscountPercent(config.getMaxDiscountPercent())
                .pointExpiryDays(config.getPointExpiryDays())
                .allowEarn(config.getAllowEarn())
                .allowRedeem(config.getAllowRedeem())
                .build();
    }
}
