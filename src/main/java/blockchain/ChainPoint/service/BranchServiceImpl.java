package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.branch.BranchRequest;
import blockchain.ChainPoint.dto.branch.BranchResponse;
import blockchain.ChainPoint.entity.Branch;
import blockchain.ChainPoint.exception.DuplicateResourceException;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.BillRepository;
import blockchain.ChainPoint.repository.BranchRepository;
import blockchain.ChainPoint.repository.DiningTableRepository;
import blockchain.ChainPoint.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BranchServiceImpl implements BranchService {

    private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");

    private final BranchRepository branchRepository;
    private final DiningTableRepository diningTableRepository;
    private final UserRepository userRepository;
    private final BillRepository billRepository;
    private final blockchain.ChainPoint.security.BranchAccess access;

    @Override
    public List<BranchResponse> getAllBranches() {
        return (access.isOwner() ? branchRepository.findAll() : branchRepository.findAllById(access.branchIds())).stream()
                .filter(branch -> access.canAccess(branch.getId()))
                .sorted(Comparator.comparing(Branch::getId))
                .map(this::toResponse)
                .toList();
    }

    @Override
    public BranchResponse getBranchById(Long id) {
        return toResponse(findBranch(id));
    }

    @Override
    @Transactional
    public BranchResponse createBranch(BranchRequest request) {
        access.requireOwner();
        String code = normalizeCode(request.getCode());

        if (branchRepository.existsByCode(code)) {
            throw new DuplicateResourceException("Branch code already exists: " + code);
        }

        Branch branch = Branch.builder()
                .code(code)
                .name(request.getName().trim())
                .address(request.getAddress().trim())
                .phone(trimToNull(request.getPhone()))
                .managerName(trimToNull(request.getManagerName()))
                .openHours(defaultOpenHours(request.getOpenHours()))
                .autoPrint(Boolean.TRUE.equals(request.getAutoPrint()))
                .vatPercent(defaultVat(request.getVatPercent()))
                .status(defaultStatus(request.getStatus()))
                .build();

        Branch saved = branchRepository.saveAndFlush(branch);
        assignManager(saved, request.getManagerId());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public BranchResponse updateBranch(Long id, BranchRequest request) {
        access.requireManagement();
        Branch branch = findBranch(id);
        String code = normalizeCode(request.getCode());

        branchRepository.findByCode(code)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Branch code already exists: " + code);
                });

        branch.setCode(code);
        branch.setName(request.getName().trim());
        branch.setAddress(request.getAddress().trim());
        branch.setPhone(trimToNull(request.getPhone()));
        branch.setManagerName(trimToNull(request.getManagerName()));
        branch.setOpenHours(defaultOpenHours(request.getOpenHours()));
        if (request.getAutoPrint() != null) branch.setAutoPrint(request.getAutoPrint());
        branch.setVatPercent(defaultVat(request.getVatPercent()));
        branch.setStatus(defaultStatus(request.getStatus()));
        assignManager(branch, request.getManagerId());

        return toResponse(branchRepository.save(branch));
    }

    @Override
    @Transactional
    public void deleteBranch(Long id) {
        access.requireOwner();
        findBranch(id).setStatus("closed");
    }

    private Branch findBranch(Long id) {
        access.check(id);
        return branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + id));
    }

    private BranchResponse toResponse(Branch branch) {
        LocalDate today = LocalDate.now(ZONE_ID);
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime weekStart = monday.atStartOfDay();
        LocalDateTime weekEnd = today.atTime(LocalTime.MAX);

        BigDecimal weeklyRevenue = billRepository.sumRevenueBetween(branch.getId(), weekStart, weekEnd);

        return BranchResponse.builder()
                .id(branch.getId())
                .code(branch.getCode())
                .name(branch.getName())
                .address(branch.getAddress())
                .phone(branch.getPhone())
                .status(branch.getStatus())
                .managerName(managerNames(branch))
                .openHours(branch.getOpenHours())
                .autoPrint(branch.getAutoPrint())
                .vatPercent(branch.getVatPercent())
                .tablesCount(diningTableRepository.countByBranchId(branch.getId()))
                .staffCount(userRepository.countStaffInBranch(branch.getId()))
                .weeklyRevenue(weeklyRevenue != null
                        ? weeklyRevenue.setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                .createdAt(branch.getCreatedAt())
                .updatedAt(branch.getUpdatedAt())
                .build();
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase();
    }

    private String managerNames(Branch branch) {
        String names = userRepository.findManagersForBranch(branch.getId()).stream().map(blockchain.ChainPoint.entity.User::getFullName)
                .collect(java.util.stream.Collectors.joining(", "));
        return names.isBlank() ? branch.getManagerName() : names;
    }

    private void assignManager(Branch branch, Long managerId) {
        if (managerId == null) return;
        access.requireOwner();
        var manager = userRepository.findById(managerId).orElseThrow(() -> new ResourceNotFoundException("Manager not found"));
        if (manager.getRole() != blockchain.ChainPoint.entity.enums.RoleType.ROLE_MANAGER || !"active".equals(manager.getStatus())) {
            throw new IllegalArgumentException("Select an active manager account");
        }
        if (manager.getBranch() == null) manager.setBranch(branch);
        manager.getManagedBranches().add(branch);
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private String defaultOpenHours(String openHours) {
        return StringUtils.hasText(openHours) ? openHours.trim() : "08:00 - 22:00";
    }

    private BigDecimal defaultVat(BigDecimal vatPercent) {
        return vatPercent != null ? vatPercent : BigDecimal.valueOf(8);
    }

    private String defaultStatus(String status) {
        return StringUtils.hasText(status) ? status.trim() : "open";
    }
}
