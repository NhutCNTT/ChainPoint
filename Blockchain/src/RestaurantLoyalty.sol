// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RestaurantLoyalty
 * @dev Sổ cái tích điểm, đổi thưởng và xác thực hóa đơn bất biến cho chuỗi nhà hàng ChainPoint.
 * Hỗ trợ mô hình tích & đổi điểm Bách Hóa Xanh (10.000 ₫ = 1 điểm, 1 điểm = 1.000 ₫ giảm trừ)
 * và cơ chế Hoàn tiền (Refund / Void Order) toàn diện.
 */
contract RestaurantLoyalty {
    // Chủ sở hữu hệ thống chuỗi (Owner)
    address public owner;

    // Tên chương trình & mã điểm
    string public name = "ChainPoint Loyalty Token";
    string public symbol = "CPL";
    uint8 public decimals = 0; // Điểm nguyên (1 điểm, 2 điểm...)

    // Trạng thái ủy quyền chi nhánh / máy POS Backend được phép ghi nhận giao dịch
    mapping(address => bool) public authorizedBranchOperators;

    // Số dư điểm của khách hàng theo địa chỉ ví
    mapping(address => uint256) private _pointBalances;

    // Sổ cái ánh xạ số điện thoại hash sang số dư điểm (định danh Web2 -> Web3)
    mapping(bytes32 => uint256) private _phonePointBalances;

    // Cấu trúc lưu vết hóa đơn chống gian lận doanh thu & kiểm soát hoàn tiền
    struct InvoiceRecord {
        string orderCode;
        uint256 branchId;
        uint256 netAmount;
        uint256 timestamp;
        bytes32 invoiceHash;
        bool exists;
        bool isRefunded;      // Cờ đánh dấu hóa đơn đã bị hủy/hoàn tiền
        uint256 refundedAt;   // Thời điểm thực hiện hoàn tiền
        string refundReason;  // Lý do hoàn tiền
    }

    mapping(string => InvoiceRecord) public invoiceRecords;

    // SỰ KIỆN (Events) để Spring Boot backend lắng nghe qua Web3j
    event PointsEarned(
        address indexed customer,
        bytes32 indexed phoneHash,
        uint256 points,
        string orderCode,
        uint256 billAmount,
        uint256 timestamp
    );

    event PointsRedeemed(
        address indexed customer,
        bytes32 indexed phoneHash,
        uint256 points,
        string orderCode,
        uint256 discountAmount,
        uint256 timestamp
    );

    event InvoiceRecorded(
        string indexed orderCode,
        uint256 indexed branchId,
        uint256 netAmount,
        bytes32 invoiceHash,
        uint256 timestamp
    );

    event OrderRefunded(
        string indexed orderCode,
        address indexed customer,
        bytes32 indexed phoneHash,
        uint256 pointsRestored,  // Điểm hoàn trả lại cho khách (đã dùng lúc mua)
        uint256 pointsRevoked,   // Điểm thu hồi lại (đã tích lúc mua)
        uint256 refundAmount,    // Số tiền hoàn lại
        string reason,
        uint256 timestamp
    );

    event BranchOperatorUpdated(address indexed operator, bool authorized);

    modifier onlyOwner() {
        require(msg.sender == owner, "ChainPoint: Chi danh cho Owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedBranchOperators[msg.sender], "ChainPoint: Khong co quyen thuc thi");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedBranchOperators[msg.sender] = true;
    }

    /**
     * @dev Thêm hoặc hủy quyền chi nhánh / POS Backend Service
     */
    function setBranchOperator(address operator, bool authorized) external onlyOwner {
        authorizedBranchOperators[operator] = authorized;
        emit BranchOperatorUpdated(operator, authorized);
    }

    /**
     * @dev Tích lũy điểm cho khách hàng sau khi thanh toán hóa đơn
     */
    function earnPoints(
        address customer,
        string memory phoneNumber,
        uint256 points,
        string memory orderCode,
        uint256 billAmount
    ) external onlyAuthorized {
        require(points > 0, "Diem tich luy phai lon hon 0");
        bytes32 phoneHash = keccak256(abi.encodePacked(phoneNumber));

        if (customer != address(0)) {
            _pointBalances[customer] += points;
        }
        _phonePointBalances[phoneHash] += points;

        emit PointsEarned(customer, phoneHash, points, orderCode, billAmount, block.timestamp);
    }

    /**
     * @dev Đổi điểm thưởng để giảm giá hóa đơn tại POS
     */
    function redeemPoints(
        address customer,
        string memory phoneNumber,
        uint256 points,
        string memory orderCode,
        uint256 discountAmount
    ) external onlyAuthorized {
        require(points > 0, "Diem doi phai lon hon 0");
        bytes32 phoneHash = keccak256(abi.encodePacked(phoneNumber));

        require(_phonePointBalances[phoneHash] >= points, "So du diem khong du de doi");
        _phonePointBalances[phoneHash] -= points;

        if (customer != address(0) && _pointBalances[customer] >= points) {
            _pointBalances[customer] -= points;
        }

        emit PointsRedeemed(customer, phoneHash, points, orderCode, discountAmount, block.timestamp);
    }

    /**
     * @dev Ghi nhận mã băm hóa đơn lên Blockchain để chống sửa đổi số liệu doanh thu
     */
    function recordInvoice(
        string memory orderCode,
        uint256 branchId,
        uint256 netAmount,
        bytes32 invoiceHash
    ) external onlyAuthorized {
        require(!invoiceRecords[orderCode].exists, "Hoa don da duoc ghi nhan");

        invoiceRecords[orderCode] = InvoiceRecord({
            orderCode: orderCode,
            branchId: branchId,
            netAmount: netAmount,
            timestamp: block.timestamp,
            invoiceHash: invoiceHash,
            exists: true,
            isRefunded: false,
            refundedAt: 0,
            refundReason: ""
        });

        emit InvoiceRecorded(orderCode, branchId, netAmount, invoiceHash, block.timestamp);
    }

    /**
     * @dev Xử lý nghiệp vụ HOÀN TIỀN (Refund / Hủy hóa đơn đã thanh toán):
     * 1. Hoàn trả lại số điểm khách đã tiêu trong đơn (pointsRestored).
     * 2. Thu hồi số điểm khách đã được tích từ đơn (pointsRevoked).
     * 3. Đánh dấu hóa đơn đã bị hoàn tiền trên sổ cái bất biến (isRefunded = true).
     */
    function refundOrder(
        string memory orderCode,
        address customer,
        string memory phoneNumber,
        uint256 pointsRestored,
        uint256 pointsRevoked,
        uint256 refundAmount,
        string memory reason
    ) external onlyAuthorized {
        InvoiceRecord storage record = invoiceRecords[orderCode];
        require(record.exists, "Hoa don khong ton tai tren blockchain");
        require(!record.isRefunded, "Hoa don nay da duoc hoan tien truoc do");

        bytes32 phoneHash = keccak256(abi.encodePacked(phoneNumber));

        // 1. Hoàn trả điểm mà khách đã dùng để giảm giá
        if (pointsRestored > 0) {
            _phonePointBalances[phoneHash] += pointsRestored;
            if (customer != address(0)) {
                _pointBalances[customer] += pointsRestored;
            }
        }

        // 2. Thu hồi lại điểm đã cộng từ hóa đơn bị hủy (nếu có)
        if (pointsRevoked > 0) {
            if (_phonePointBalances[phoneHash] >= pointsRevoked) {
                _phonePointBalances[phoneHash] -= pointsRevoked;
            } else {
                // Trường hợp khách đã dùng hết điểm: hạ về 0 (hoặc ghi nợ điểm trong DB)
                _phonePointBalances[phoneHash] = 0;
            }

            if (customer != address(0)) {
                if (_pointBalances[customer] >= pointsRevoked) {
                    _pointBalances[customer] -= pointsRevoked;
                } else {
                    _pointBalances[customer] = 0;
                }
            }
        }

        // 3. Đánh dấu trạng thái hóa đơn là đã hoàn tiền
        record.isRefunded = true;
        record.refundedAt = block.timestamp;
        record.refundReason = reason;

        emit OrderRefunded(
            orderCode,
            customer,
            phoneHash,
            pointsRestored,
            pointsRevoked,
            refundAmount,
            reason,
            block.timestamp
        );
    }

    /**
     * @dev Tra cứu số dư điểm theo số điện thoại
     */
    function getPointsByPhone(string memory phoneNumber) external view returns (uint256) {
        bytes32 phoneHash = keccak256(abi.encodePacked(phoneNumber));
        return _phonePointBalances[phoneHash];
    }

    /**
     * @dev Tra cứu số dư điểm theo địa chỉ ví
     */
    function getPointsByAddress(address customer) external view returns (uint256) {
        return _pointBalances[customer];
    }

    /**
     * @dev Xác thực hóa đơn trên Blockchain và kiểm tra trạng thái hoàn tiền
     */
    function verifyInvoice(string memory orderCode) external view returns (
        bool exists,
        uint256 branchId,
        uint256 netAmount,
        bytes32 invoiceHash,
        uint256 timestamp,
        bool isRefunded,
        uint256 refundedAt,
        string memory refundReason
    ) {
        InvoiceRecord memory rec = invoiceRecords[orderCode];
        return (
            rec.exists,
            rec.branchId,
            rec.netAmount,
            rec.invoiceHash,
            rec.timestamp,
            rec.isRefunded,
            rec.refundedAt,
            rec.refundReason
        );
    }
}
