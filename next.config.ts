import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    const apiBaseUrl =
      process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : 'http://mbs-backend:3000'

    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
