import axios, { type InternalAxiosRequestConfig } from 'axios'

// Server-side (Node) needs an absolute URL to reach the backend; browser uses /api (rewritten by Next.js).
const baseURL =
  typeof window === 'undefined'
    ? `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api`
    : '/api'

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
})

// Callback when refresh fails (e.g. clear user + redirect to login). Set by AuthRefreshProvider.
let onRefreshFailure: (() => void) | null = null

export function setOnRefreshFailure(fn: (() => void) | null): void {
  onRefreshFailure = fn
}

// Routes that must NOT trigger refresh + retry (avoid loops).
const AUTH_ROUTES_NO_REFRESH = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
]

function isAuthRouteNoRefresh(url: string): boolean {
  const path = url.replace(baseURL, '').split('?')[0]
  return AUTH_ROUTES_NO_REFRESH.some((route) => path === route || path.startsWith(route + '/'))
}

// Single in-flight refresh promise so multiple 401s share one refresh.
let refreshPromise: Promise<unknown> | null = null

function doRefresh(): Promise<unknown> {
  if (refreshPromise) return refreshPromise
  refreshPromise = apiClient.post('/auth/refresh')
  refreshPromise
    .then(() => {
      refreshPromise = null
    })
    .catch(() => {
      refreshPromise = null
    })
  return refreshPromise
}

if (typeof window !== 'undefined') {
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      if (error.response?.status !== 401) {
        return Promise.reject(error)
      }

      const url = originalRequest.url ?? ''
      if (isAuthRouteNoRefresh(url)) {
        return Promise.reject(error)
      }

      // Avoid infinite retry loop if refresh fails.
      if (originalRequest._retry) {
        onRefreshFailure?.()
        return Promise.reject(error)
      }

      try {
        await doRefresh()
        originalRequest._retry = true
        return apiClient(originalRequest)
      } catch {
        onRefreshFailure?.()
        return Promise.reject(error)
      }
    },
  )
}
