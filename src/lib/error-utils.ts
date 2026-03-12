/**
 * Safe helpers for unknown catch bindings (no explicit any).
 */

export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return String(e)
}

export function getErrorCode(e: unknown): string | undefined {
  if (
    e &&
    typeof e === 'object' &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string'
  ) {
    return (e as { code: string }).code
  }
  return undefined
}

/** Axios-style error with response.status */
export function getResponseStatus(e: unknown): number | undefined {
  if (
    e &&
    typeof e === 'object' &&
    'response' in e &&
    e.response &&
    typeof e.response === 'object' &&
    e.response !== null &&
    'status' in e.response &&
    typeof (e.response as { status: unknown }).status === 'number'
  ) {
    return (e.response as { status: number }).status
  }
  return undefined
}

/** Axios-style error.response.data.code */
export function getResponseDataCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'response' in e) {
    const res = (e as { response?: unknown }).response
    if (res && typeof res === 'object' && res !== null && 'data' in res) {
      const data = (res as { data?: unknown }).data
      if (data && typeof data === 'object' && data !== null && 'code' in data) {
        const code = (data as { code?: unknown }).code
        if (typeof code === 'string') return code
      }
    }
  }
  return undefined
}
