import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  basePath: '/next-auth',
  reactStrictMode: true,
  // If you're deploying to a sub-path, you might also need this
  assetPrefix: '/next-auth',
};

export default nextConfig;
