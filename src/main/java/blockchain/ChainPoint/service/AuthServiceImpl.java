package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.auth.LoginRequest;
import blockchain.ChainPoint.dto.auth.LoginResponse;
import blockchain.ChainPoint.dto.auth.RegisterRequest;
import blockchain.ChainPoint.dto.auth.RegisterResponse;
import blockchain.ChainPoint.entity.Area;
import blockchain.ChainPoint.entity.Branch;
import blockchain.ChainPoint.entity.User;
import blockchain.ChainPoint.entity.enums.RoleType;
import blockchain.ChainPoint.exception.DuplicateResourceException;
import blockchain.ChainPoint.repository.AreaRepository;
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
import java.util.Random;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final AreaRepository areaRepository;
    private final PasswordEncoder passwordEncoder;

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

        User user = userDetails.getUser();
        Branch branch = user.getBranch();
        String accessToken = jwtTokenProvider.generateToken(userDetails);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .branchName(branch != null ? branch.getName() : null)
                .branchCode(branch != null ? branch.getCode() : null)
                .build();
    }

    @Override
    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String phone = request.getPhone().trim();
        if (userRepository.existsByUsername(phone)) {
            throw new DuplicateResourceException("Số điện thoại " + phone + " đã được đăng ký trong hệ thống!");
        }

        // 1. Tạo mã chi nhánh duy nhất
        String branchCode = generateBranchCode();

        // 2. Tạo chi nhánh mới cho chủ cửa hàng
        Branch branch = Branch.builder()
                .code(branchCode)
                .name(request.getRestaurantName().trim())
                .address(request.getProvince().trim())
                .phone(phone)
                .managerName(request.getFullName().trim())
                .openHours("08:00 - 22:30")
                .vatPercent(BigDecimal.valueOf(8.0))
                .status("open")
                .build();
        branch = branchRepository.save(branch);

        // 3. Khởi tạo khu vực mặc định: Tầng 1
        Area area = Area.builder()
                .branch(branch)
                .code("KV-T1")
                .name("Tầng 1")
                .displayOrder(1)
                .build();
        areaRepository.save(area);

        // 4. Tạo tài khoản User với vai trò Chủ chuỗi (ROLE_OWNER)
        User user = User.builder()
                .username(phone)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .phone(phone)
                .role(RoleType.ROLE_OWNER)
                .branch(branch)
                .status("active")
                .build();
        user = userRepository.save(user);

        // 5. Sinh token JWT để người dùng tự động đăng nhập
        CustomUserDetails userDetails = new CustomUserDetails(user);
        String accessToken = jwtTokenProvider.generateToken(userDetails);

        return RegisterResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .branchId(branch.getId())
                .branchName(branch.getName())
                .branchCode(branch.getCode())
                .province(branch.getAddress())
                .message("Đăng ký tài khoản và khởi tạo chuỗi nhà hàng thành công!")
                .build();
    }

    private String generateBranchCode() {
        Random random = new Random();
        for (int i = 0; i < 20; i++) {
            String code = "CN-" + (1000 + random.nextInt(9000));
            if (!branchRepository.existsByCode(code)) {
                return code;
            }
        }
        return "CN-" + (System.currentTimeMillis() % 100000);
    }
}
