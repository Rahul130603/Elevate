import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: "/admin-news",
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  /**
   * Next blocks dev-only resources (the HMR socket and the dev overlay itself) for
   * any origin other than the one the server started with. Opening the dev site as
   * `127.0.0.1` while the server calls itself `localhost` fails every HMR
   * handshake — a console error on every page, which the dev overlay counts as an
   * "issue". `connect.bat` (phone over Wi-Fi) needs its own entry: add this
   * laptop's LAN address here if hot reload is wanted there too.
   */
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    /**
     * How long the client keeps a visited page in its router cache. Clicking
     * between sections then swaps pages instantly instead of refetching, which is
     * what makes the nav feel slow on a news site with many sections.
     */
    staleTimes: {
      static: 300,
      dynamic: 0,
    },
  },
};

export default nextConfig;
