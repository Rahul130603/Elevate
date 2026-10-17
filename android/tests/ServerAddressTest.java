import com.calendar.eventmanagement.ServerAddress;

public class ServerAddressTest {
    private static void expect(String input, boolean online, String expected) {
        String actual = ServerAddress.normalize(input, online);
        if (!expected.equals(actual)) throw new AssertionError(input + " -> " + actual);
    }
    private static void reject(String input, boolean online) {
        try { ServerAddress.normalize(input, online); }
        catch (IllegalArgumentException expected) { return; }
        throw new AssertionError("Should reject: " + input);
    }
    public static void main(String[] args) {
        expect("192.168.0.27", false, "http://192.168.0.27:3000");
        expect(" 192.168.0.27:3000 ", false, "http://192.168.0.27:3000");
        expect("http://192.168.0.27:5000/", false, "http://192.168.0.27:5000");
        expect("10.0.0.2", false, "http://10.0.0.2:3000");
        expect("172.16.0.2", false, "http://172.16.0.2:3000");
        expect("elevate.local", false, "http://elevate.local:3000");
        expect("example.com", true, "https://example.com");
        expect("https://example.com/", true, "https://example.com");
        reject("", false); reject("localhost:3000", false); reject("127.0.0.1", false);
        reject("192.168.0.999", false); reject("http://example.com", false);
        reject("http://192.168.0.27:3000", true); reject("192.168.0.27:0", false);
        reject("192.168.0.27:99999", false); reject("192.168.0.27:3000/admin", false);
        reject("https://name:password@example.com", true); reject("https://example.com?x=1", true);
        System.out.println("Server address tests passed (18 cases).");
    }
}
