import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // A second `next dev` in this folder (a browser check while another one runs) needs its own
  // build folder: Next 16 keeps one dev lock per distDir. Unset = the usual .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Worktree gemelli (CLAUDE.md): node_modules è un symlink al checkout principale, fuori dalla
  // cartella del progetto, e Turbopack rifiuta un link che esce dalla sua radice. Con
  // NEXT_TURBOPACK_ROOT=/percorso/di/mbs la radice contiene entrambi. Unset = comportamento solito.
  ...(process.env.NEXT_TURBOPACK_ROOT
    ? { turbopack: { root: process.env.NEXT_TURBOPACK_ROOT } }
    : {}),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '0' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // CSP is set dynamically by middleware.ts (with per-request nonce)
        ],
      },
    ]
  },
  async rewrites() {
    // In development the API is the mock of smoke/mock-api (port 4000); MOCK_API_URL points
    // a second dev server at a mock on another port when 4000 is taken.
    const apiBaseUrl =
      process.env.NODE_ENV === 'development'
        ? (process.env.MOCK_API_URL ?? 'http://localhost:4000')
        : 'http://mbs-backend:3000'

    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
