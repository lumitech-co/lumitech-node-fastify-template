// Query parameters that carry a credential are blanked before a URL is logged.
export const SECRET_QUERY_PARAM =
    /([?&](?:token|access_token|refresh_token|id_token|secret|client_secret|password|api_key|apikey|key|signature|sig|code|state)=)[^&#]*/giu;

export const REDACTED_VALUE = "[redacted]";

export const RETRY_DEFAULT_MAX_ATTEMPTS = 3;

export const RETRY_DEFAULT_BASE_DELAY_MS = 1_000;

export const RETRY_BACKOFF_BASE = 2;

// One-sided jitter, up to +20% of the delay, so concurrent workers don't retry
// in lockstep.
export const RETRY_JITTER_RATIO = 0.2;

export const MS_PER_SECOND = 1_000;

// A huge Retry-After must not park a worker slot for hours.
export const RETRY_MAX_RETRY_AFTER_MS = 60_000;

export const RATE_LIMIT_STATUS = 429;

// GitHub-style secondary rate limit: a 403 that carries Retry-After.
export const SECONDARY_RATE_LIMIT_STATUS = 403;

// Safe to replay after a 5xx / network drop (RFC 7231 §4.2.2); POST and PATCH
// may already have landed.
export const IDEMPOTENT_METHODS: ReadonlySet<string> = new Set([
    "GET",
    "HEAD",
    "PUT",
    "DELETE",
    "OPTIONS",
    "TRACE",
]);

export const RETRY_DEFAULT_RETRYABLE_STATUSES: ReadonlySet<number> = new Set([
    502, 503, 504,
]);
