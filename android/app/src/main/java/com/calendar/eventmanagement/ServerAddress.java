package com.calendar.eventmanagement;

import java.net.URI;
import java.util.Locale;

/** Normalizes server numbers without requiring the user to type a URL scheme. */
public final class ServerAddress {
    private ServerAddress() {}

    public static String normalize(String input, boolean publicMode) {
        String value = input == null ? "" : input.trim();
        if (value.isEmpty()) throw new IllegalArgumentException("Enter your laptop IP address or server URL.");
        if (!value.contains("://")) value = (publicMode ? "https://" : "http://") + value;
        try {
            URI uri = new URI(value);
            String host = uri.getHost();
            String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
            if (host == null || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null || (uri.getPath() != null && !uri.getPath().isEmpty() && !uri.getPath().equals("/"))) {
                throw new IllegalArgumentException("Enter only the server address, without a page path.");
            }
            boolean lan = host.toLowerCase(Locale.ROOT).endsWith(".local");
            if (host.matches("\\d+\\.\\d+\\.\\d+\\.\\d+")) {
                String[] parts = host.split("\\.");
                int[] octets = new int[4];
                for (int i = 0; i < 4; i++) {
                    octets[i] = Integer.parseInt(parts[i]);
                    if (octets[i] > 255) throw new IllegalArgumentException("Enter a valid IP address.");
                }
                lan = octets[0] == 10 || (octets[0] == 192 && octets[1] == 168) || (octets[0] == 172 && octets[1] >= 16 && octets[1] <= 31);
            }
            if (!scheme.equals("https") && !(scheme.equals("http") && lan && !publicMode)) {
                throw new IllegalArgumentException(publicMode ? "Public servers must use HTTPS." : "Use your laptop's Wi-Fi IP address or an HTTPS server.");
            }
            int port = uri.getPort();
            if (port == 0 || port > 65535 || (uri.getRawAuthority().endsWith(":") && port == -1)) throw new IllegalArgumentException("Enter a valid server port.");
            if (port == -1 && scheme.equals("http") && lan) port = 3000;
            return new URI(scheme, null, host, port, null, null, null).toString();
        } catch (java.net.URISyntaxException | NumberFormatException error) {
            throw new IllegalArgumentException("Enter a valid server address, e.g. 192.168.0.27:3000.");
        }
    }
}
