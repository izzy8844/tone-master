import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8765";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/audio/:path*",
        destination: `${BACKEND_URL}/api/audio/:path*`,
      },
      {
        source: "/api/midi/:path*",
        destination: `${BACKEND_URL}/api/midi/:path*`,
      },
      {
        source: "/api/plugins",
        destination: `${BACKEND_URL}/api/plugins`,
      },
      {
        source: "/api/presets",
        destination: `${BACKEND_URL}/api/presets`,
      },
    ];
  },
};

export default nextConfig;
