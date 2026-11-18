package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.loyalty.LoyaltyConfigDto;
import blockchain.ChainPoint.dto.loyalty.LoyaltyTransactionResponse;

import java.util.List;

public interface LoyaltyService {

    LoyaltyConfigDto getConfig();

    LoyaltyConfigDto updateConfig(LoyaltyConfigDto request);

    List<LoyaltyTransactionResponse> getTransactions(Long branchId);
}
