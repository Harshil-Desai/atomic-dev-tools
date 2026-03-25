/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@/ui", "@/utils"],
  assetPrefix: 'https://atomic-dev-tools.vercel.app',
};

module.exports = nextConfig;
