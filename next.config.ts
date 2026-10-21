import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // keep the dev badge off the sidebar latency card
  devIndicators: { position: "bottom-right" },
  // a lockfile in the home directory made Next guess the wrong workspace root
  // one-click ordering must not be framable (clickjacking); the CSP itself is set per request in proxy.ts
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // production only: a pinned localhost would break the plain-http dev backend
          ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
