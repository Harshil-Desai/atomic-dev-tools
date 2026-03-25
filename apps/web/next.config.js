/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@/ui", "@/utils"],
  assetPrefix: 'https://atomic-dev-tools-web.vercel.app',
};

module.exports = nextConfig;
