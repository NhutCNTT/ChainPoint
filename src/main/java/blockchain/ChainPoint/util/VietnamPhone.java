package blockchain.ChainPoint.util;

public final class VietnamPhone {
    private VietnamPhone() {}
    public static String normalize(String input) {
        String phone = input == null ? "" : input.replaceAll("[\\s().-]", "");
        if (phone.startsWith("+84")) phone = "0" + phone.substring(3);
        else if (phone.startsWith("84")) phone = "0" + phone.substring(2);
        if (!phone.matches("0[35789][0-9]{8}")) throw new IllegalArgumentException("Số điện thoại di động Việt Nam không hợp lệ");
        return phone;
    }
    public static java.util.List<String> variants(String input) {
        String phone = normalize(input);
        return java.util.List.of(phone, "+84" + phone.substring(1), "84" + phone.substring(1));
    }
}
