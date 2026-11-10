package blockchain.ChainPoint.dto.table;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiningTableResponse {

    private Long id;

    private String code;

    private String name;

    private String area;

    private Integer seats;

    private String status;

    private String note;

    private Long branchId;

    private String branchName;

    private String branchCode;
}
