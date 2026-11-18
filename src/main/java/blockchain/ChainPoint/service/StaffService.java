package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.staff.StaffRequest;
import blockchain.ChainPoint.dto.staff.StaffResponse;

import java.util.List;

public interface StaffService {

    List<StaffResponse> getStaff(Long branchId);

    StaffResponse createStaff(StaffRequest request);

    StaffResponse updateStaff(Long id, StaffRequest request);

    void deleteStaff(Long id);
}
