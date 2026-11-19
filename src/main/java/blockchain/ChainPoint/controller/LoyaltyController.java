package blockchain.ChainPoint.controller;

import blockchain.ChainPoint.dto.loyalty.LoyaltyConfigDto;
import blockchain.ChainPoint.dto.loyalty.LoyaltyTransactionResponse;
import blockchain.ChainPoint.service.LoyaltyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/loyalty")
@CrossOrigin
@RequiredArgsConstructor
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    @GetMapping("/config")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER','ADMIN','STORE_OWNER','BRANCH_MANAGER')")
    public ResponseEntity<LoyaltyConfigDto> getConfig() {
        return ResponseEntity.ok(loyaltyService.getConfig());
    }

    @PutMapping("/config")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<LoyaltyConfigDto> updateConfig(
            @jakarta.validation.Valid @RequestBody LoyaltyConfigDto request
    ) {
        return ResponseEntity.ok(loyaltyService.updateConfig(request));
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('OWNER','MANAGER','CASHIER','ADMIN','STORE_OWNER','BRANCH_MANAGER')")
    public ResponseEntity<List<LoyaltyTransactionResponse>> getTransactions(
            @RequestParam(required = false) Long branchId
    ) {
        return ResponseEntity.ok(loyaltyService.getTransactions(branchId));
    }
}
