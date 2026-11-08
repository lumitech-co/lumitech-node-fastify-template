export type RequestLogEntry = {
    method: string;
    url: string;
    host: string;
    remoteAddress: string;
    remotePort?: number;
};

export type FetchWithRetryOptions = {
    maxAttempts?: number;
    baseDelayMs?: number;
    retryableStatuses?: ReadonlySet<number>;
    retryNonIdempotent?: boolean;
    baseFetch?: typeof fetch;
};
