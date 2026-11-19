package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.auth.LoginRequest;
import blockchain.ChainPoint.dto.auth.LoginResponse;
import blockchain.ChainPoint.dto.auth.RegisterRequest;
import blockchain.ChainPoint.entity.Branch;
import blockchain.ChainPoint.entity.User;
import blockchain.ChainPoint.entity.enums.RoleType;
import blockchain.ChainPoint.exception.DuplicateResourceException;
import blockchain.ChainPoint.repository.BranchRepository;
import blockchain.ChainPoint.repository.UserRepository;
import blockchain.ChainPoint.security.CustomUserDetails;
import blockchain.ChainPoint.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;

    @org.springframework.beans.factory.annotation.Value("${auth.registration-enabled:false}")
    private boolean registrationEnabled;

    @Override
    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        if (!(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new IllegalStateException("Unexpected authenticated principal type");
        }

        return toLoginResponse(userDetails.getUser());
    }

    @Override
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        if (!registrationEnabled || userRepository.count() > 0) {
            throw new org.springframework.security.access.AccessDeniedException("Owner registration is closed. Contact the existing owner.");
        }
        String phone = request.getPhone().trim();

        if (userRepository.existsByUsername(phone)) {
            throw new DuplicateResourceException(
                    "Số điện thoại này đã được đăng ký. Vui lòng đăng nhập hoặc dùng số khác."
            );
        }

        Branch branch = branchRepository.save(Branch.builder()
                .code(generateBranchCode())
                .name(request.getRestaurantName().trim())
                .address(request.getProvince().trim())
                .phone(phone)
                .managerName(request.getFullName().trim())
                .openHours("08:00 - 22:00")
                .vatPercent(BigDecimal.valueOf(8))
                .status("open")
                .build());

        User user = userRepository.save(User.builder()
                .username(phone)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(phone)
                .role(RoleType.ROLE_OWNER)
                .branch(branch)
                .status("active")
                .build());

        return toLoginResponse(user);
    }

    public LoginResponse toLoginResponse(User user) {
        Branch branch = user.getBranch();
        String accessToken = jwtTokenProvider.generateToken(new CustomUserDetails(user));

        return LoginResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .phone(user.getPhone())
                .branchId(branch != null ? branch.getId() : null)
                .branchName(branch != null ? branch.getName() : null)
                .branchCode(branch != null ? branch.getCode() : null)
                .branchIds(new CustomUserDetails(user).getBranchIds())
                .build();
    }

    private String generateBranchCode() {
        long next = branchRepository.count() + 1;
        String code = "CN-" + next;

        while (branchRepository.existsByCode(code)) {
            next++;
            code = "CN-" + next;
        }

        return code;
    }
}
