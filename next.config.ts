import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let phones load the dev server: same Wi-Fi, or the HTTPS Cloudflare tunnel (needed for GPS)
  allowedDevOrigins: ["192.168.254.112", "*.trycloudflare.com"],
};

export default nextConfig;
