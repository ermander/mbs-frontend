import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function generateNonce() {
  return crypto.randomBytes(16).toString('base64')
}

export function middleware(req: NextRequest) {
  const nonce = generateNonce()

  const csp = [
    `default-src 'self'`,
    // nonce per tutti gli script first-party (Next/React/runtime)
    `script-src 'self' 'nonce-${nonce}'`,
    // styles: se usi Tailwind + shadcn spesso serve ancora unsafe-inline, poi si può stringere
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    // consenti chiamate API
    `connect-src 'self' https://api.matched-betting-system.com`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    // opzionale ma utile
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')

  const res = NextResponse.next()

  // Next.js può estrarre il nonce dalla CSP e applicarlo automaticamente agli script
  res.headers.set('Content-Security-Policy', csp)
  // utile per debug/telemetria interna; non strettamente necessario
  res.headers.set('x-nonce', nonce)

  return res
}

// Applica a tutte le route “page”, escludendo asset statici
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
