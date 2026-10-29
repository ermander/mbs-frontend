/**
 * Session cookies feature: what the frontend does when a request fails while the user is
 * logged in. Only a real 401 from the backend means the session is gone (expired or revoked
 * refresh token); a network error, a 502 from the rewrite while the backend restarts for a
 * deploy, or a 5xx must NOT throw the user out, because the cookies are still valid.
 */

/** True only for an HTTP 401 answered by the backend (axios error shape, no import). */
export function isUnauthenticatedError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const response = (error as { response?: { status?: unknown } }).response
  return typeof response === 'object' && response !== null && response.status === 401
}

/** Ceiling of the wait between two bootstrap retries while the backend is unreachable. */
export const BOOTSTRAP_RETRY_MAX_MS = 30_000

/**
 * Wait before retry number `attempt` (1-based) of /auth/me when the backend did not answer
 * with a 401: 2 s, 4 s, 8 s, 16 s, then 30 s for ever. A deploy keeps the backend down for
 * a few tens of seconds, so the page recovers on its own without a reload.
 */
export function bootstrapRetryDelayMs(attempt: number): number {
  if (!Number.isFinite(attempt) || attempt < 1) return 0
  return Math.min(BOOTSTRAP_RETRY_MAX_MS, 2000 * 2 ** (Math.floor(attempt) - 1))
}
