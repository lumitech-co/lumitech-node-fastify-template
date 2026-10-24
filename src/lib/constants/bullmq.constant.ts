import type { WorkerOptions } from "bullmq";

export const BULLMQ_CONNECT_TIMEOUT_MS = 2000;

export const BULLMQ_KEEP_ALIVE_MS = 10000;

export const BULLMQ_MAX_RETRIES_PER_REQUEST = null;

export const BULLMQ_PRODUCER_MAX_RETRIES_PER_REQUEST = 1;

export const BULLMQ_RETRY_BACKOFF_STEP_MS = 200;

export const BULLMQ_RETRY_BACKOFF_MAX_MS = 2000;

export const QUEUE_WORKER_PLUGIN_PATTERN = /\/mq\/.+\.worker\.(ts|js)$/;

/**
 * BullMQ allows one stall by default, then fails the job for good and skips its
 * `attempts`. A deploy that kills an in-flight job is a stall, so allow a few;
 * the longer lock keeps a slow (not dead) job from being flagged as stalled.
 */
export const WORKER_STALL_DEFAULTS: Pick<
    WorkerOptions,
    "lockDuration" | "maxStalledCount"
> = {
    lockDuration: 60_000,
    maxStalledCount: 3,
};
