package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.pos.*;
import blockchain.ChainPoint.entity.*;
import blockchain.ChainPoint.exception.*;
import blockchain.ChainPoint.repository.*;
import blockchain.ChainPoint.security.BranchAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class CheckoutServiceImpl implements CheckoutService {
    private final BranchRepository branchRepository;
    private final DiningTableRepository tableRepository;
    private final ProductRepository productRepository;
    private final BillRepository billRepository;
    private final BranchAccess access;
    private final SettlementService settlement;

    @Override
    public CheckoutResponse saveOrder(CheckoutRequest request) { return response(save(request)); }

    @Override
    public CheckoutResponse processCheckout(CheckoutRequest request) {
        Bill bill;
        if (request.getOrderCode() != null && !request.getOrderCode().isBlank()) {
            access.check(request.getBranchId());
            bill = locked(request.getOrderCode());
            if (!bill.getBranch().getId().equals(request.getBranchId()) || !bill.getTableCode().equals(request.getTableCode())) {
                throw new IllegalArgumentException("Order and branch/table do not match");
            }
        } else { bill = save(request); }
        settlement.prepare(bill, request);
        return response(billRepository.saveAndFlush(bill));
    }

    private Bill save(CheckoutRequest request) {
        Long branchId = access.requireBranch(request.getBranchId());
        if (request.getRequestKey() == null || request.getRequestKey().isBlank()) throw new IllegalArgumentException("A stable requestKey is required for duplicate protection");
        Bill previous = billRepository.findByRequestKey(request.getRequestKey()).orElse(null);
        if (previous != null && (request.getOrderCode() == null || request.getOrderCode().isBlank())) {
            Bill locked = locked(previous.getBillCode()); checkReplay(locked, request); return locked;
        }
        Bill editing = request.getOrderCode() == null || request.getOrderCode().isBlank() ? null : locked(request.getOrderCode());
        Branch branch = branchRepository.findById(branchId).orElseThrow(() -> new ResourceNotFoundException("Branch not found"));
        if (!"open".equalsIgnoreCase(branch.getStatus())) throw new IllegalArgumentException("Branch is closed");
        DiningTable table = tableRepository.findForUpdate(request.getTableCode(), branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Table not found in this branch"));
        if (request.getOrderCode() == null || request.getOrderCode().isBlank()) {
            previous = billRepository.findByRequestKey(request.getRequestKey()).orElse(null);
            if (previous != null) { checkReplay(previous, request); return previous; }
        }
        Bill bill;
        if (request.getOrderCode() != null && !request.getOrderCode().isBlank()) {
            bill = editing;
            if (!bill.getBranch().getId().equals(branchId) || !bill.getTableCode().equals(table.getCode())) throw new IllegalArgumentException("Cannot move an order to another branch or table");
            if (!"open".equals(bill.getStatus())) throw new IllegalArgumentException("Only open orders can be edited");
        } else {
            if ("busy".equals(table.getStatus()) || "pending".equals(table.getStatus()) || "disabled".equals(table.getStatus())) throw new DuplicateResourceException("Table is occupied or disabled; reload the active order");
            bill = Bill.builder().billCode("HD" + UUID.randomUUID().toString().replace("-", "").substring(0, 26))
                    .requestKey(request.getRequestKey()).branch(branch).tableCode(table.getCode())
                    .cashierUsername(access.user().getUsername()).status("open")
                    .grossAmount(BigDecimal.ZERO).finalAmount(BigDecimal.ZERO).build();
        }
        Map<Long, Integer> wanted = new TreeMap<>();
        Map<Long, String> notes = new HashMap<>();
        if (request.getItems() == null || request.getItems().isEmpty()) throw new IllegalArgumentException("Order requires items");
        for (CheckoutItemRequest item : request.getItems()) {
            if (item.getProductId() == null || item.getQuantity() == null || item.getQuantity() <= 0) throw new IllegalArgumentException("Invalid order item");
            wanted.merge(item.getProductId(), item.getQuantity(), Math::addExact); notes.put(item.getProductId(), item.getNote());
        }
        Map<Long, Integer> reserved = new TreeMap<>();
        bill.getDetails().forEach(d -> reserved.merge(d.getProduct().getId(), d.getQuantity(), Integer::sum));
        Set<Long> ids = new TreeSet<>(wanted.keySet()); ids.addAll(reserved.keySet());
        Map<Long, Product> products = new HashMap<>();
        for (Long id : ids) {
            Product product = productRepository.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
            if (product.getBranch() != null && !branchId.equals(product.getBranch().getId())) throw new org.springframework.security.access.AccessDeniedException("Product belongs to another branch");
            int delta = wanted.getOrDefault(id, 0) - reserved.getOrDefault(id, 0);
            if (delta > 0 && !"available".equals(product.getStatus())) throw new InsufficientStockException("Product is unavailable: " + product.getCode());
            boolean depleted = product.getStockQuantity() == 0;
            int remaining = product.getStockQuantity() - delta;
            if (remaining < 0) throw new InsufficientStockException("Insufficient stock: " + product.getCode());
            product.setStockQuantity(remaining);
            if (remaining == 0) product.setStatus("out_of_stock");
            else if (delta < 0 && depleted && "out_of_stock".equals(product.getStatus())) product.setStatus("available");
            products.put(id, product);
        }
        bill.getDetails().clear();
        BigDecimal gross = BigDecimal.ZERO;
        for (var entry : wanted.entrySet()) {
            Product product = products.get(entry.getKey());
            BigDecimal subtotal = product.getPrice().multiply(BigDecimal.valueOf(entry.getValue()));
            bill.getDetails().add(BillDetail.builder().bill(bill).product(product).productName(product.getName())
                    .unitPrice(product.getPrice()).quantity(entry.getValue()).subtotal(subtotal).note(notes.get(entry.getKey())).build());
            gross = gross.add(subtotal);
        }
        bill.setNote(request.getNote()); bill.setGrossAmount(gross); bill.setFinalAmount(gross); table.setStatus("busy");
        return billRepository.saveAndFlush(bill);
    }

    private void checkReplay(Bill bill, CheckoutRequest request) {
        access.check(bill.getBranch().getId());
        if (!bill.getCashierUsername().equals(access.user().getUsername()) || !bill.getBranch().getId().equals(request.getBranchId()) || !bill.getTableCode().equals(request.getTableCode())) throw new DuplicateResourceException("Request key already belongs to a different order");
        Map<Long, Integer> persisted = new TreeMap<>(), requested = new TreeMap<>();
        bill.getDetails().forEach(d -> persisted.merge(d.getProduct().getId(), d.getQuantity(), Integer::sum));
        request.getItems().forEach(i -> requested.merge(i.getProductId(), i.getQuantity(), Integer::sum));
        if (!persisted.equals(requested)) throw new DuplicateResourceException("Request key reused with different items");
    }

    @Override
    public void cancelOrder(String code) {
        Bill bill = locked(code);
        if ("cancelled".equals(bill.getStatus())) return;
        if (!"open".equals(bill.getStatus()) && !"pending".equals(bill.getStatus())) throw new IllegalArgumentException("Only unpaid orders can be cancelled");
        if ("pending".equals(bill.getStatus())) access.requireManagement();
        bill.getDetails().stream().sorted(Comparator.comparing(d -> d.getProduct().getId())).forEach(d -> {
            Product product = productRepository.findByIdForUpdate(d.getProduct().getId()).orElseThrow();
            boolean depleted = product.getStockQuantity() == 0;
            product.setStockQuantity(product.getStockQuantity() + d.getQuantity());
            if (depleted && "out_of_stock".equals(product.getStatus())) product.setStatus("available");
        });
        settlement.releaseReservedPoints(bill); bill.setStatus("cancelled");
        tableRepository.findByCodeAndBranchId(bill.getTableCode(), bill.getBranch().getId()).ifPresent(t -> t.setStatus("active"));
    }

    private Bill locked(String code) {
        Bill bill = billRepository.findForUpdate(code).orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        access.check(bill.getBranch().getId()); return bill;
    }

    static CheckoutResponse response(Bill bill) {
        return CheckoutResponse.builder().billCode(bill.getBillCode()).tableCode(bill.getTableCode())
                .grossAmount(bill.getGrossAmount()).discountAmount(bill.getDiscountAmount()).pointsUsed(bill.getPointsUsed())
                .pointsEarned(bill.getPointsEarned()).finalAmount(bill.getFinalAmount()).billHash(bill.getBillHash())
                .status(bill.getStatus()).createdAt(bill.getCreatedAt()).build();
    }
}
