import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        // Everything except the public booking routes (which need to be
        // frameable for the embed widget — see the /book rule below).
        source: "/((?!book|embed.js).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:;",
          },
        ],
      },
      {
        // Public booking pages and the embed loader are designed to be
        // embedded on a clinic's own website — no sensitive data is exposed
        // here that isn't already public via /api/booking-data, and the
        // booking flow itself requires explicit confirmation before submit.
        source: "/book/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; frame-ancestors *;",
          },
        ],
      },
      {
        source: "/embed.js",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ]
  },
};

export default nextConfig;
