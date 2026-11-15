package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.branch.BranchRequest;
import blockchain.ChainPoint.dto.branch.BranchResponse;
import blockchain.ChainPoint.entity.Branch;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.repository.BranchRepository;
import blockchain.ChainPoint.repository.DiningTableRepository;
import blockchain.ChainPoint.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BranchServiceImpl implements BranchService {

    private final BranchRepository branchRepository;
    private final DiningTableRepository diningTableRepository;
    private final UserRepository userRepository;
    private final BillRepository billRepository;

    @Override
    @Transactional(readOnly = true)
    public List<BranchResponse> getAllBranches() {
        return branchRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BranchResponse getBranchById(Long id) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh ID: " + id));
        return toResponse(branch);
    }

    @Override
    @Transactional
    public BranchResponse createBranch(BranchRequest request) {
        Branch branch = Branch.builder()
                .code(request.getCode().toUpperCase())
                .name(request.getName())
                .address(request.getAddress())
                .phone(request.getPhone())
                .openHours(request.getOpenHours() != null ? request.getOpenHours() : "08:00 - 22:30")
                .managerName(request.getManagerName())
                .vatPercent(request.getVatPercent() != null ? request.getVatPercent() : BigDecimal.valueOf(8.0))
                .status(request.getStatus() != null ? request.getStatus() : "open")
                .build();

        return toResponse(branchRepository.save(branch));
    }

    @Override
    @Transactional
    public BranchResponse updateBranch(Long id, BranchRequest request) {
        Branch branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh ID: " + id));

        branch.setCode(request.getCode().toUpperCase());
        branch.setName(request.getName());
        branch.setAddress(request.getAddress());
        branch.setPhone(request.getPhone());
        if (request.getOpenHours() != null) branch.setOpenHours(request.getOpenHours());
        if (request.getManagerName() != null) branch.setManagerName(request.getManagerName());
        if (request.getVatPercent() != null) branch.setVatPercent(request.getVatPercent());
        if (request.getStatus() != null) branch.setStatus(request.getStatus());

        return toResponse(branchRepository.save(branch));
    }

    @Override
    @Transactional
    public void deleteBranch(Long id) {
        if (!branchRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy chi nhánh ID: " + id);
        }
        branchRepository.deleteById(id);
    }

    private BranchResponse toResponse(Branch branch) {
        Long branchId = branch.getId();
        Long tableCount = diningTableRepository.countByBranchId(branchId);
        Long staffCount = userRepository.countByBranchId(branchId);

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneWeekAgo = now.minusDays(7);
        BigDecimal weeklyRevenue = billRepository.sumRevenueBetween(branchId, oneWeekAgo, now);

        return BranchResponse.builder()
                .id(branch.getId())
                .code(branch.getCode())
                .name(branch.getName())
                .address(branch.getAddress())
                .phone(branch.getPhone())
                .openHours(branch.getOpenHours())
                .managerName(branch.getManagerName())
                .vatPercent(branch.getVatPercent())
                .status(branch.getStatus())
                .tablesCount(tableCount != null ? tableCount.intValue() : 0)
                .staffCount(staffCount != null ? staffCount.intValue() : 0)
                .weeklyRevenue(weeklyRevenue != null ? weeklyRevenue : BigDecimal.ZERO)
                .createdAt(branch.getCreatedAt())
                .build();
    }
}
