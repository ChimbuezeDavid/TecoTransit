/** @type {import('next').NextConfig} */

const pwa = require('@ducanh2912/next-pwa');
const withPWA = pwa.default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "*.vercel-storage.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
