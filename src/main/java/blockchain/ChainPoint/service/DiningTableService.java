package blockchain.ChainPoint.service;

import blockchain.ChainPoint.dto.table.DiningTableRequest;
import blockchain.ChainPoint.dto.table.DiningTableResponse;

import java.util.List;

public interface DiningTableService {

    List<DiningTableResponse> getTables(Long branchId, String area, String status);

    DiningTableResponse getTableById(Long id);

    DiningTableResponse createTable(DiningTableRequest request);

    DiningTableResponse updateTable(Long id, DiningTableRequest request);

    void deleteTable(Long id);
}
