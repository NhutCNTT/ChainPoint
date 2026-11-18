package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.customer.CustomerRequest;
import blockchain.ChainPoint.dto.customer.CustomerResponse;

import java.util.List;

public interface CustomerService {

    List<CustomerResponse> getCustomers(Long branchId, String query);

    CustomerResponse getCustomerById(Long id);

    CustomerResponse getCustomerByPhone(String phone);

    CustomerResponse createCustomer(CustomerRequest request);

    CustomerResponse updateCustomer(Long id, CustomerRequest request);

    void deleteCustomer(Long id);
}
