package blockchain.ChainPoint.controller;

import blockchain.ChainPoint.dto.table.DiningTableRequest;
import blockchain.ChainPoint.dto.table.DiningTableResponse;
import blockchain.ChainPoint.service.DiningTableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tables")
@CrossOrigin
@RequiredArgsConstructor
public class DiningTableController {

    private final DiningTableService diningTableService;

    @GetMapping
    public ResponseEntity<List<DiningTableResponse>> getTables(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String status
    ) {
        return ResponseEntity.ok(diningTableService.getTables(branchId, area, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DiningTableResponse> getTableById(@PathVariable Long id) {
        return ResponseEntity.ok(diningTableService.getTableById(id));
    }

    @PostMapping
    public ResponseEntity<DiningTableResponse> createTable(
            @Valid @RequestBody DiningTableRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(diningTableService.createTable(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DiningTableResponse> updateTable(
            @PathVariable Long id,
            @Valid @RequestBody DiningTableRequest request
    ) {
        return ResponseEntity.ok(diningTableService.updateTable(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTable(@PathVariable Long id) {
        diningTableService.deleteTable(id);
        return ResponseEntity.noContent().build();
    }
}
