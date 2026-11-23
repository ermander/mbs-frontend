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
  experimental: {
    // The /api rewrite below is a proxy with a timeout of its own, 30 s unless said otherwise: past
    // it the browser gets a 500 while the backend is still working. «Ricalcola» (ADAPTER_STATUS
    // §14.392) waits for a bookmaker up to a minute, and its client gives up at 90 s.
    proxyTimeout: 95_000,
  },
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
          // CSP is set dynamically by src/proxy.ts (with per-request nonce)
        ],
      },
    ]
  },
  async rewrites() {
    // In development the API is the mock in mock-api/server.js (port 4000); MOCK_API_URL points
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
