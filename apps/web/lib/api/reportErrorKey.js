/**
 * Map an ApiError from a report submission to an i18n sub-key. The caller prefixes
 * its namespace (e.g. `report.` or `poster.report.`), so the same five keys exist in
 * each report block. User-facing copy stays generic per code (§9); detail is server-side.
 * @param {{ code?: string }} [err]
 * @returns {'errorSelf'|'errorRate'|'errorGone'|'errorNetwork'|'error'}
 */
export function reportErrorKey(err) {
  switch (err?.code) {
    case 'VALIDATION_ERROR':
      return 'errorSelf' // self-report (own post / own profile)
    case 'RATE_LIMITED':
      return 'errorRate'
    case 'NOT_FOUND':
      return 'errorGone'
    case 'NETWORK_ERROR':
      return 'errorNetwork'
    default:
      return 'error'
  }
}
