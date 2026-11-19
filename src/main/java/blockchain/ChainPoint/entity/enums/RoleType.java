package blockchain.ChainPoint.entity.enums;

public enum RoleType {
    ROLE_OWNER,
    ROLE_MANAGER,
    ROLE_CASHIER;

    public static RoleType fromStored(String value) {
        if (value == null) throw new IllegalArgumentException("Role is required");
        String role = value.trim().toUpperCase(java.util.Locale.ROOT).replaceFirst("^ROLE_", "");
        return switch (role) {
            case "OWNER", "ADMIN" -> ROLE_OWNER;
            case "MANAGER", "BRANCH" -> ROLE_MANAGER;
            case "CASHIER", "EMPLOYEE", "POS" -> ROLE_CASHIER;
            default -> throw new IllegalArgumentException("Unsupported role");
        };
    }
}
