import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignoriraj TypeScript greške u produkcijskom buildu
  // TODO: Popraviti TS greške i ukloniti ovo
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignoriraj ESLint greške u buildu
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
