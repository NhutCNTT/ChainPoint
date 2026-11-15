package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.staff.StaffRequest;
import blockchain.ChainPoint.dto.staff.StaffResponse;

import java.util.List;

public interface StaffService {
    List<StaffResponse> getAllStaff(Long branchId, String role);
    StaffResponse getStaffById(Long id);
    StaffResponse createStaff(StaffRequest request);
    StaffResponse updateStaff(Long id, StaffRequest request);
    void deleteStaff(Long id);
}
