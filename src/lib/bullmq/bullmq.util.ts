import type { JobDataScalar, JobDataSummary } from "./bullmq.type.js";

const isScalar = (value: unknown): value is JobDataScalar =>
    value === null || ["string", "number", "boolean"].includes(typeof value);

/**
 * Top-level scalars only (ids, keys, flags) for a job-failure log: nested
 * payloads carry user content that does not belong in logs.
 */
export const summarizeJobData = (data: unknown): JobDataSummary | null =>
    data !== null && typeof data === "object"
        ? Object.fromEntries(
              Object.entries(data).filter(
                  (entry): entry is [string, JobDataScalar] =>
                      isScalar(entry[1])
              )
          )
        : null;
