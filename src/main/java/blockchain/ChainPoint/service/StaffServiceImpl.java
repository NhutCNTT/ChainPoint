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
    private final blockchain.ChainPoint.security.BranchAccess branchAccess;

    @Override
    public List<StaffResponse> getStaff(Long branchId) {
        branchId = branchAccess.scope(branchId);
        List<User> users = branchId != null
                ? userRepository.findByBranchIdOrderByIdAsc(branchId)
                : userRepository.findAllByOrderByIdAsc();

        return users.stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public StaffResponse createStaff(StaffRequest request) {
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

        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public StaffResponse updateStaff(Long id, StaffRequest request) {
        User user = findUser(id);
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

        if (StringUtils.hasText(request.getPassword())) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteStaff(Long id) {
        userRepository.delete(findUser(id));
    }

    private User findUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff account not found with id: " + id));
        branchAccess.require(user.getBranch() != null ? user.getBranch().getId() : null);
        if (!branchAccess.isOwner() && user.getRole() != RoleType.ROLE_CASHIER) {
            throw new org.springframework.security.access.AccessDeniedException("Managers can manage cashier accounts only");
        }
        return user;
    }

    private Branch resolveBranch(Long branchId) {
        branchId = branchAccess.scope(branchId);
        if (branchId == null) {
            return null;
        }

        return branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + branchId));
    }

    private RoleType parseRole(String role) {
        if (!branchAccess.isOwner() && !"ROLE_CASHIER".equals(role)) {
            throw new org.springframework.security.access.AccessDeniedException("Only owners can assign management roles");
        }
        try {
            return RoleType.valueOf(role.trim().toUpperCase());
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
                .branchName(branch != null ? branch.getName() : null)
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
