// A request still waiting for its first response byte after this long is
// treated as hung and answered 503, freeing its slot instead of holding it to
// the platform's own request timeout (Cloud Run: 30 minutes).
export const REQUEST_TIMEOUT_MS = 60_000;

export const REQUEST_TIMEOUT_STATUS_CODE = 503;

export const REQUEST_TIMEOUT_RESPONSE = {
    statusCode: REQUEST_TIMEOUT_STATUS_CODE,
    code: "503",
    error: "Service Unavailable",
    message: "Request timeout",
} as const;

// Pathnames of routes that build a large body (an export, a report) before
// the first byte and may legitimately run past the timeout.
export const UNTIMED_ROUTES: RegExp[] = [];
