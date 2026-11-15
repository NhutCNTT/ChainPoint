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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffServiceImpl implements StaffService {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<StaffResponse> getAllStaff(Long branchId, String role) {
        List<User> users;
        if (branchId != null) {
            users = userRepository.findByBranchId(branchId);
        } else {
            users = userRepository.findAll();
        }

        if (role != null && !role.isBlank() && !"all".equalsIgnoreCase(role)) {
            String roleUpper = role.toUpperCase();
            if (!roleUpper.startsWith("ROLE_")) {
                roleUpper = "ROLE_" + roleUpper;
            }
            final String filterRole = roleUpper;
            users = users.stream()
                    .filter(u -> u.getRole() != null && u.getRole().name().equalsIgnoreCase(filterRole))
                    .collect(Collectors.toList());
        }

        return users.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public StaffResponse getStaffById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên ID: " + id));
        return toResponse(user);
    }

    @Override
    @Transactional
    public StaffResponse createStaff(StaffRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Tên đăng nhập '" + request.getUsername() + "' đã tồn tại!");
        }

        Branch branch = null;
        if (request.getBranchId() != null) {
            branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh ID: " + request.getBranchId()));
        }

        String roleStr = request.getRole().toUpperCase();
        if (!roleStr.startsWith("ROLE_")) {
            roleStr = "ROLE_" + roleStr;
        }
        RoleType roleType = RoleType.valueOf(roleStr);

        String rawPassword = (request.getPassword() != null && !request.getPassword().isBlank())
                ? request.getPassword()
                : "123456";

        User user = User.builder()
                .username(request.getUsername().trim())
                .password(passwordEncoder.encode(rawPassword))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .role(roleType)
                .branch(branch)
                .status(request.getStatus() != null ? request.getStatus() : "active")
                .build();

        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public StaffResponse updateStaff(Long id, StaffRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên ID: " + id));

        if (!user.getUsername().equalsIgnoreCase(request.getUsername()) &&
                userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Tên đăng nhập '" + request.getUsername() + "' đã tồn tại!");
        }

        user.setUsername(request.getUsername().trim());
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRole() != null) {
            String roleStr = request.getRole().toUpperCase();
            if (!roleStr.startsWith("ROLE_")) {
                roleStr = "ROLE_" + roleStr;
            }
            user.setRole(RoleType.valueOf(roleStr));
        }

        if (request.getBranchId() != null) {
            Branch branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chi nhánh ID: " + request.getBranchId()));
            user.setBranch(branch);
        } else {
            user.setBranch(null);
        }

        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }

        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteStaff(Long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy nhân viên ID: " + id);
        }
        userRepository.deleteById(id);
    }

    private StaffResponse toResponse(User user) {
        return StaffResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .branchId(user.getBranch() != null ? user.getBranch().getId() : null)
                .branchName(user.getBranch() != null ? user.getBranch().getName() : "Toàn hệ thống")
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
