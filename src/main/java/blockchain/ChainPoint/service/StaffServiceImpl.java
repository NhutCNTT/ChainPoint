package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.staff.StaffRequest;
import blockchain.ChainPoint.dto.staff.StaffResponse;
import blockchain.ChainPoint.entity.Branch;
import blockchain.ChainPoint.entity.User;
import blockchain.ChainPoint.entity.enums.RoleType;
import blockchain.ChainPoint.exception.DuplicateResourceException;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.BranchRepository;
import blockchain.ChainPoint.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StaffServiceImpl implements StaffService {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;
    private final blockchain.ChainPoint.security.BranchAccess access;

    @Override
    public List<StaffResponse> getStaff(Long branchId) {
        access.requireManagement();
        if (branchId != null) access.check(branchId);
        List<User> users = !access.isOwner() ? userRepository.findCashiersInBranches(branchId == null ? access.branchIds() : java.util.Set.of(branchId)) : branchId != null
                ? userRepository.findAllByOrderByIdAsc().stream().filter(u ->
                    (u.getBranch() != null && branchId.equals(u.getBranch().getId()))
                    || u.getManagedBranches().stream().anyMatch(b -> branchId.equals(b.getId()))).toList()
                : userRepository.findAllByOrderByIdAsc();

        return users.stream()
                .filter(u -> access.isOwner() || (u.getRole() == RoleType.ROLE_CASHIER
                        && u.getBranch() != null && access.canAccess(u.getBranch().getId())))
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public StaffResponse createStaff(StaffRequest request) {
        validateAssignment(request);
        String username = request.getUsername().trim().toLowerCase();

        if (userRepository.existsByUsername(username)) {
            throw new DuplicateResourceException("Username already exists: " + username);
        }

        if (!StringUtils.hasText(request.getPassword())) {
            throw new IllegalArgumentException("Password is required when creating a staff account");
        }

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(trimToNull(request.getPhone()))
                .email(trimToNull(request.getEmail()))
                .role(parseRole(request.getRole()))
                .branch(resolveBranch(request.getBranchId()))
                .status(defaultStatus(request.getStatus()))
                .build();

        setManagedBranches(user, request);

        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public StaffResponse updateStaff(Long id, StaffRequest request) {
        User user = findUser(id);
        validateAssignment(request);
        if (user.getId().equals(access.user().getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Use profile settings for your own account");
        }
        String username = request.getUsername().trim().toLowerCase();

        if (!Objects.equals(user.getUsername(), username)
                && userRepository.existsByUsername(username)) {
            throw new DuplicateResourceException("Username already exists: " + username);
        }

        user.setUsername(username);
        user.setFullName(request.getFullName().trim());
        user.setPhone(trimToNull(request.getPhone()));
        user.setEmail(trimToNull(request.getEmail()));
        user.setRole(parseRole(request.getRole()));
        user.setBranch(resolveBranch(request.getBranchId()));
        user.setStatus(defaultStatus(request.getStatus()));
        setManagedBranches(user, request);

        if (StringUtils.hasText(request.getPassword())) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteStaff(Long id) {
        User user = findUser(id);
        if (user.getId().equals(access.user().getId()) || user.getRole() == RoleType.ROLE_OWNER) {
            throw new org.springframework.security.access.AccessDeniedException("Owner and current accounts cannot be deactivated here");
        }
        user.setStatus("inactive");
    }

    private void validateAssignment(StaffRequest request) {
        access.requireManagement();
        RoleType role = parseRole(request.getRole());
        if (role == RoleType.ROLE_OWNER) throw new org.springframework.security.access.AccessDeniedException("Owner creation is not a staff workflow");
        if (!access.isOwner() && role != RoleType.ROLE_CASHIER) {
            throw new org.springframework.security.access.AccessDeniedException("Managers can manage cashiers only");
        }
        access.requireBranch(request.getBranchId());
        if (request.getBranchId() == null) throw new IllegalArgumentException("Primary branch is required");
        if (request.getBranchIds() != null && !request.getBranchIds().isEmpty()) {
            if (role != RoleType.ROLE_MANAGER) throw new IllegalArgumentException("Only managers can have multiple branch assignments");
            access.requireOwner();
            request.getBranchIds().forEach(access::check);
        }
        if (request.getPassword() != null && !request.getPassword().isBlank() && request.getPassword().length() < 8) {
            throw new IllegalArgumentException("Password must contain at least 8 characters");
        }
    }

    private void setManagedBranches(User user, StaffRequest request) {
        user.getManagedBranches().clear();
        if (user.getRole() == RoleType.ROLE_MANAGER) {
            user.getManagedBranches().add(user.getBranch());
            if (request.getBranchIds() != null) request.getBranchIds().forEach(id -> user.getManagedBranches().add(resolveBranch(id)));
        }
    }

    private User findUser(Long id) {
        access.requireManagement();
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff account not found with id: " + id));
        if (!access.isOwner()) {
            if (user.getRole() != RoleType.ROLE_CASHIER) throw new org.springframework.security.access.AccessDeniedException("Cashier management only");
            access.check(user.getBranch() == null ? null : user.getBranch().getId());
        }
        return user;
    }

    private Branch resolveBranch(Long branchId) {
        if (branchId == null) {
            return null;
        }

        return branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + branchId));
    }

    private RoleType parseRole(String role) {
        try {
            return RoleType.fromStored(role);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid role: " + role);
        }
    }

    private String defaultStatus(String status) {
        return StringUtils.hasText(status) ? status.trim() : "active";
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private StaffResponse toResponse(User user) {
        Branch branch = user.getBranch();

        return StaffResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .branchId(branch != null ? branch.getId() : null)
                .branchIds(new blockchain.ChainPoint.security.CustomUserDetails(user).getBranchIds())
                .branchName(branch != null ? branch.getName() : null)
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
