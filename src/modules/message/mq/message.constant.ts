import type { JobsOptions } from "bullmq";

export const MESSAGE_QUEUE_NAME = "message";

export enum MessageJobName {
    Create = "create",
    Update = "update",
    Delete = "delete",
}

export const MESSAGE_QUEUE_DEFAULT_JOB_OPTIONS: JobsOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
    removeOnFail: 100,
};
