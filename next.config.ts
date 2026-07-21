import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.31.46", "10.84.64.254"],
  devIndicators: false,
};

export default nextConfig;
