import { NextRequest, NextResponse } from 'next/server'

function generateNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

export function middleware(req: NextRequest) {
  const nonce = generateNonce()

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api.matched-betting-system.com`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  // Pass nonce via request headers so Next.js can read it and apply it to script tags
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  res.headers.set('Content-Security-Policy', csp)

  return res
}

// Applica a tutte le route “page”, escludendo asset statici
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
