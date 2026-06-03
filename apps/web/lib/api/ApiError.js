/**
 * Typed error thrown by the API client. Carries the server envelope's error
 * code and the HTTP status so callers (and TanStack Query) can branch on them.
 */
export class ApiError extends Error {
  /**
   * @param {string} code - envelope error code (e.g. AUTH_REQUIRED) or NETWORK_ERROR
   * @param {string} message - human-readable message (generic for users)
   * @param {number} status - HTTP status, or 0 for transport failures
   */
  constructor(code, message, status) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}
