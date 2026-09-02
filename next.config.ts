import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3005';
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
