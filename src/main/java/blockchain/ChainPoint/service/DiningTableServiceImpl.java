package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.table.DiningTableRequest;
import blockchain.ChainPoint.dto.table.DiningTableResponse;
import blockchain.ChainPoint.entity.Branch;
import blockchain.ChainPoint.entity.DiningTable;
import blockchain.ChainPoint.exception.DuplicateResourceException;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.BranchRepository;
import blockchain.ChainPoint.repository.DiningTableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DiningTableServiceImpl implements DiningTableService {

    private static final String STATUS_ACTIVE = "active";

    private final DiningTableRepository diningTableRepository;
    private final BranchRepository branchRepository;
    private final blockchain.ChainPoint.security.BranchAccess access;

    @Override
    public List<DiningTableResponse> getTables(Long branchId, String area, String status) {
        branchId = access.resolve(branchId);
        List<DiningTable> tables;

        if (branchId != null && StringUtils.hasText(area)) {
            tables = diningTableRepository.findByBranchIdAndArea(branchId, area);
        } else if (branchId != null) {
            tables = diningTableRepository.findByBranchId(branchId);
        } else if (StringUtils.hasText(status)) {
            tables = diningTableRepository.findByStatus(status);
        } else {
            tables = diningTableRepository.findAll();
        }

        if (StringUtils.hasText(area)) {
            tables = tables.stream()
                    .filter(table -> area.equalsIgnoreCase(table.getArea()))
                    .toList();
        }

        if (StringUtils.hasText(status)) {
            tables = tables.stream()
                    .filter(table -> status.equalsIgnoreCase(table.getStatus()))
                    .toList();
        }

        return tables.stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public DiningTableResponse getTableById(Long id) {
        return toResponse(findTable(id));
    }

    @Override
    @Transactional
    public DiningTableResponse createTable(DiningTableRequest request) {
        access.requireManagement();
        Branch branch = findBranch(request.getBranchId());

        if (diningTableRepository.findByCodeAndBranchId(request.getCode(), branch.getId()).isPresent()) {
            throw new DuplicateResourceException(
                    "Table code already exists in this branch: " + request.getCode()
            );
        }

        DiningTable table = DiningTable.builder()
                .code(request.getCode())
                .name(request.getName())
                .area(request.getArea())
                .seats(request.getSeats())
                .status(defaultStatus(request.getStatus()))
                .note(request.getNote())
                .branch(branch)
                .build();

        return toResponse(diningTableRepository.save(table));
    }

    @Override
    @Transactional
    public DiningTableResponse updateTable(Long id, DiningTableRequest request) {
        access.requireManagement();
        DiningTable table = findTable(id);
        if ("busy".equals(table.getStatus()) || "pending".equals(table.getStatus())) throw new IllegalArgumentException("Occupied tables cannot be reconfigured");
        Branch branch = findBranch(request.getBranchId());

        diningTableRepository.findByCodeAndBranchId(request.getCode(), branch.getId())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException(
                            "Table code already exists in this branch: " + request.getCode()
                    );
                });

        table.setCode(request.getCode());
        table.setName(request.getName());
        table.setArea(request.getArea());
        table.setSeats(request.getSeats());
        table.setStatus(defaultStatus(request.getStatus()));
        table.setNote(request.getNote());
        table.setBranch(branch);

        return toResponse(diningTableRepository.save(table));
    }

    @Override
    @Transactional
    public void deleteTable(Long id) {
        access.requireManagement();
        DiningTable table = findTable(id);
        if ("busy".equals(table.getStatus()) || "pending".equals(table.getStatus())) {
            throw new IllegalArgumentException("Cannot disable an occupied table");
        }
        table.setStatus("disabled");
    }

    private DiningTable findTable(Long id) {
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dining table not found with id: " + id));
        access.check(table.getBranch().getId());
        return table;
    }

    private Branch findBranch(Long branchId) {
        access.check(branchId);
        return branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + branchId));
    }

    private String defaultStatus(String status) {
        return StringUtils.hasText(status) ? status : STATUS_ACTIVE;
    }

    private DiningTableResponse toResponse(DiningTable table) {
        Branch branch = table.getBranch();

        return DiningTableResponse.builder()
                .id(table.getId())
                .code(table.getCode())
                .name(table.getName())
                .area(table.getArea())
                .seats(table.getSeats())
                .status(table.getStatus())
                .note(table.getNote())
                .branchId(branch != null ? branch.getId() : null)
                .branchName(branch != null ? branch.getName() : null)
                .branchCode(branch != null ? branch.getCode() : null)
                .build();
    }
}
