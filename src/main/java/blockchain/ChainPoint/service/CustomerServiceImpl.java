package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.customer.CustomerRequest;
import blockchain.ChainPoint.dto.customer.CustomerResponse;
import blockchain.ChainPoint.entity.Branch;
import blockchain.ChainPoint.entity.Customer;
import blockchain.ChainPoint.exception.DuplicateResourceException;
import blockchain.ChainPoint.exception.ResourceNotFoundException;
import blockchain.ChainPoint.repository.BranchRepository;
import blockchain.ChainPoint.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerServiceImpl implements CustomerService {

    private static final String DEFAULT_TIER = "Bạc";

    private final CustomerRepository customerRepository;
    private final BranchRepository branchRepository;

    @Override
    public List<CustomerResponse> getCustomers(Long branchId, String query) {
        List<Customer> customers = branchId != null
                ? customerRepository.findByBranchId(branchId)
                : customerRepository.findAllByOrderByCreatedAtDesc();

        String normalized = StringUtils.hasText(query) ? query.trim().toLowerCase(Locale.ROOT) : null;

        return customers.stream()
                .filter(customer -> normalized == null
                        || customer.getName().toLowerCase(Locale.ROOT).contains(normalized)
                        || customer.getPhone().contains(normalized)
                        || customer.getCode().toLowerCase(Locale.ROOT).contains(normalized))
                .map(this::toResponse)
                .toList();
    }

    @Override
    public CustomerResponse getCustomerById(Long id) {
        return toResponse(findCustomer(id));
    }

    @Override
    public CustomerResponse getCustomerByPhone(String phone) {
        return customerRepository.findByPhone(phone.trim())
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Customer not found with phone: " + phone
                ));
    }

    @Override
    @Transactional
    public CustomerResponse createCustomer(CustomerRequest request) {
        String phone = request.getPhone().trim();

        if (customerRepository.existsByPhone(phone)) {
            throw new DuplicateResourceException("Số điện thoại đã được đăng ký hội viên: " + phone);
        }

        Customer customer = Customer.builder()
                .code(generateCustomerCode())
                .name(request.getName().trim())
                .phone(phone)
                .dateOfBirth(request.getDateOfBirth())
                .tier(defaultTier(request.getTier()))
                .points(canAdjustLoyaltyPoints() ? defaultPoints(request.getPoints()) : 0L)
                .walletAddress(trimToNull(request.getWalletAddress()))
                .branch(resolveBranch(request.getBranchId()))
                .build();

        return toResponse(customerRepository.save(customer));
    }

    @Override
    @Transactional
    public CustomerResponse updateCustomer(Long id, CustomerRequest request) {
        Customer customer = findCustomer(id);
        String phone = request.getPhone().trim();

        if (!Objects.equals(customer.getPhone(), phone)
                && customerRepository.existsByPhone(phone)) {
            throw new DuplicateResourceException("Số điện thoại đã được đăng ký hội viên: " + phone);
        }

        customer.setName(request.getName().trim());
        customer.setPhone(phone);
        customer.setDateOfBirth(request.getDateOfBirth());
        customer.setTier(defaultTier(request.getTier()));
        if (request.getPoints() != null && canAdjustLoyaltyPoints()) {
            customer.setPoints(Math.max(0L, request.getPoints()));
        }
        customer.setWalletAddress(trimToNull(request.getWalletAddress()));
        customer.setBranch(resolveBranch(request.getBranchId()));

        return toResponse(customerRepository.save(customer));
    }

    @Override
    @Transactional
    public void deleteCustomer(Long id) {
        customerRepository.delete(findCustomer(id));
    }

    private Customer findCustomer(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
    }

    private Branch resolveBranch(Long branchId) {
        if (branchId == null) {
            return null;
        }

        return branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + branchId));
    }

    private String generateCustomerCode() {
        long next = customerRepository.count() + 1;
        String code = "KH" + String.format("%06d", next);

        while (customerRepository.existsByCode(code)) {
            next++;
            code = "KH" + String.format("%06d", next);
        }

        return code;
    }

    private boolean canAdjustLoyaltyPoints() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_OWNER".equals(authority.getAuthority())
                        || "ROLE_MANAGER".equals(authority.getAuthority()));
    }

    private String defaultTier(String tier) {
        return StringUtils.hasText(tier) ? tier.trim() : DEFAULT_TIER;
    }

    private Long defaultPoints(Long points) {
        return points != null && points >= 0 ? points : 0L;
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private CustomerResponse toResponse(Customer customer) {
        Branch branch = customer.getBranch();

        return CustomerResponse.builder()
                .id(customer.getId())
                .code(customer.getCode())
                .name(customer.getName())
                .phone(customer.getPhone())
                .dateOfBirth(customer.getDateOfBirth())
                .tier(customer.getTier())
                .points(customer.getPoints())
                .totalSpent(customer.getTotalSpent())
                .walletAddress(customer.getWalletAddress())
                .branchId(branch != null ? branch.getId() : null)
                .branchName(branch != null ? branch.getName() : null)
                .createdAt(customer.getCreatedAt())
                .updatedAt(customer.getUpdatedAt())
                .build();
    }
}
