import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// Load env.local file (without dot prefix to avoid conflict with folder)
config({ path: resolve(process.cwd(), "env.local") });

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
