import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_PAGES = ['/login', '/registrazione']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasAccessToken = request.cookies.has('access_token')

  if (hasAccessToken && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: https://flagcdn.com`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')

  const response = NextResponse.next()
  response.headers.set('x-nonce', nonce)
  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    '/login',
    '/registrazione',
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
