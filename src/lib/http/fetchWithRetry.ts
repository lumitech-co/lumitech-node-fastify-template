import { randomInt } from "node:crypto";
import type { FetchWithRetryOptions } from "./http.type.js";
import {
    IDEMPOTENT_METHODS,
    MS_PER_SECOND,
    RATE_LIMIT_STATUS,
    RETRY_BACKOFF_BASE,
    RETRY_DEFAULT_BASE_DELAY_MS,
    RETRY_DEFAULT_MAX_ATTEMPTS,
    RETRY_DEFAULT_RETRYABLE_STATUSES,
    RETRY_JITTER_RATIO,
    RETRY_MAX_RETRY_AFTER_MS,
    SECONDARY_RATE_LIMIT_STATUS,
} from "./http.constant.js";

const sleep = (ms: number): Promise<number> =>
    new Promise((resolve) =>
        setTimeout(() => {
            resolve(ms);
        }, ms)
    );

const resolveMethod = ({
    input,
    init,
}: {
    input: Parameters<typeof fetch>[0];
    init: Parameters<typeof fetch>[1];
}): string =>
    (
        init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

/** Delta-seconds `Retry-After` in ms, capped; the HTTP-date form falls back to backoff. */
const parseRetryAfterMs = (response: Response): number | null => {
    const seconds = Number(response.headers.get("retry-after") ?? Number.NaN);

    return Number.isFinite(seconds)
        ? Math.min(seconds * MS_PER_SECOND, RETRY_MAX_RETRY_AFTER_MS)
        : null;
};

const backoffDelayMs = ({
    attempt,
    baseDelayMs,
}: {
    attempt: number;
    baseDelayMs: number;
}): number => {
    const delay = baseDelayMs * RETRY_BACKOFF_BASE ** (attempt - 1);

    return delay + randomInt(Math.floor(delay * RETRY_JITTER_RATIO) + 1);
};

const shouldRetryResponse = ({
    response,
    retryableStatuses,
    idempotent,
}: {
    response: Response;
    retryableStatuses: ReadonlySet<number>;
    idempotent: boolean;
}): boolean => {
    const isRateLimit =
        response.status === RATE_LIMIT_STATUS ||
        (response.status === SECONDARY_RATE_LIMIT_STATUS &&
            parseRetryAfterMs(response) !== null);

    return (
        !response.ok &&
        (isRateLimit || (retryableStatuses.has(response.status) && idempotent))
    );
};

/**
 * A drop-in `fetch` that retries rate limits for any method and 5xx / network
 * drops only for idempotent methods, so writes stay at-most-once.
 */
export const makeFetchWithRetry =
    ({
        maxAttempts = RETRY_DEFAULT_MAX_ATTEMPTS,
        baseDelayMs = RETRY_DEFAULT_BASE_DELAY_MS,
        retryableStatuses = RETRY_DEFAULT_RETRYABLE_STATUSES,
        retryNonIdempotent = false,
        baseFetch,
    }: FetchWithRetryOptions): typeof fetch =>
    async (input, init) => {
        // Resolved per call, so a test that stubs global fetch is honoured.
        const doFetch = baseFetch ?? globalThis.fetch;

        const idempotent =
            retryNonIdempotent ||
            IDEMPOTENT_METHODS.has(resolveMethod({ input, init }));

        for (let attempt = 1; ; attempt += 1) {
            const isLastAttempt = attempt >= maxAttempts;

            try {
                const response = await doFetch(input, init);

                const retry = shouldRetryResponse({
                    response,
                    retryableStatuses,
                    idempotent,
                });

                if (!retry || isLastAttempt) {
                    return response;
                }

                await response.text().catch(() => "");

                await sleep(
                    parseRetryAfterMs(response) ??
                        backoffDelayMs({ attempt, baseDelayMs })
                );
            } catch (error) {
                if (isLastAttempt || !idempotent) {
                    throw error;
                }

                await sleep(backoffDelayMs({ attempt, baseDelayMs }));
            }
        }
    };

/** Default policy: 3 attempts, 1s / 2s / 4s plus jitter. */
export const fetchWithRetry: typeof fetch = makeFetchWithRetry({});
