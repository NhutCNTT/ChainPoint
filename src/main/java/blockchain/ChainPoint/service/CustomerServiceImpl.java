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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final BranchRepository branchRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CustomerResponse> getAllCustomers() {
        return customerRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng ID: " + id));
        return toResponse(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getCustomerByPhone(String phone) {
        Customer customer = customerRepository.findByPhone(phone.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng với SĐT: " + phone));
        return toResponse(customer);
    }

    @Override
    @Transactional
    public CustomerResponse createCustomer(CustomerRequest request) {
        String phone = request.getPhone().trim();
        if (customerRepository.findByPhone(phone).isPresent()) {
            throw new DuplicateResourceException("Số điện thoại '" + phone + "' đã được đăng ký hội viên!");
        }

        Branch branch = null;
        if (request.getBranchId() != null) {
            branch = branchRepository.findById(request.getBranchId()).orElse(null);
        }

        String code = request.getCode();
        if (code == null || code.isBlank()) {
            code = "KH" + (10000 + customerRepository.count() + 1);
        }

        Customer customer = Customer.builder()
                .code(code)
                .name(request.getName().trim())
                .phone(phone)
                .dateOfBirth(request.getDateOfBirth())
                .tier("Bạc")
                .points(0L)
                .totalSpent(BigDecimal.ZERO)
                .walletAddress(request.getWalletAddress())
                .branch(branch)
                .build();

        return toResponse(customerRepository.save(customer));
    }

    @Override
    @Transactional
    public CustomerResponse updateCustomer(Long id, CustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng ID: " + id));

        customer.setName(request.getName().trim());
        customer.setDateOfBirth(request.getDateOfBirth());
        if (request.getWalletAddress() != null) {
            customer.setWalletAddress(request.getWalletAddress());
        }

        return toResponse(customerRepository.save(customer));
    }

    private CustomerResponse toResponse(Customer customer) {
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
                .branchId(customer.getBranch() != null ? customer.getBranch().getId() : null)
                .branchName(customer.getBranch() != null ? customer.getBranch().getName() : "Toàn chuỗi")
                .createdAt(customer.getCreatedAt())
                .build();
    }
}
