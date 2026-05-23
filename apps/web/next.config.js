/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@/utils"],
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://atomic-dev-tools-web.vercel.app' : undefined,
};

module.exports = nextConfig;
