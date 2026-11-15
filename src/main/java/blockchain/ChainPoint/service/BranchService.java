package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.branch.BranchRequest;
import blockchain.ChainPoint.dto.branch.BranchResponse;

import java.util.List;

public interface BranchService {
    List<BranchResponse> getAllBranches();
    BranchResponse getBranchById(Long id);
    BranchResponse createBranch(BranchRequest request);
    BranchResponse updateBranch(Long id, BranchRequest request);
    void deleteBranch(Long id);
}
