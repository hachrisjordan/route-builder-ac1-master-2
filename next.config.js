/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    TZ: 'Asia/Tokyo',
  },
  // Enable React strict mode for better development
  reactStrictMode: true,
  // Automatically includes any environment variables that begin with NEXT_PUBLIC_
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig 