package blockchain.ChainPoint.entity.enums;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class RoleTypeConverter implements AttributeConverter<RoleType, String> {
    public String convertToDatabaseColumn(RoleType role) { return role == null ? null : role.name(); }
    public RoleType convertToEntityAttribute(String value) { return value == null ? null : RoleType.fromStored(value); }
}
