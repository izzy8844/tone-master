import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8765";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }, { protocol: "https", hostname: "**.supabase.co" }] },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
    ]}];
  },
  async rewrites() {
    if (!process.env.BACKEND_URL && process.env.NODE_ENV === "production") { console.warn("[next.config] BACKEND_URL not set — audio/midi rewrites will target localhost"); }
    return [
      { source: "/api/audio/:path*", destination: `${BACKEND_URL}/api/audio/:path*` },
      { source: "/api/midi/:path*", destination: `${BACKEND_URL}/api/midi/:path*` },
      { source: "/api/plugins", destination: `${BACKEND_URL}/api/plugins` },
      { source: "/api/presets", destination: `${BACKEND_URL}/api/presets` },
    ];
  },
};

export default nextConfig;
