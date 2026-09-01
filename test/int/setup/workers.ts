import os from "node:os";

/**
 * How many databases the integration lane provisions, and therefore how many
 * test files may run at once. globalSetup creates exactly this many databases
 * and vitest is capped to the same number of workers, so every worker owns one
 * database for the whole run (see env.ts).
 */
export const INT_TEST_WORKERS = Number(
    process.env.INT_TEST_WORKERS ??
        Math.max(1, Math.min(os.cpus().length - 1, 8))
);

export const TEMPLATE_DATABASE = "int_test_template";

export const workerDatabaseName = (poolId: number) => `int_test_w${poolId}`;

/**
 * Redis logical database index for a worker. Postgres gives each worker its own
 * cloned database; Redis has no per-worker instance, so each worker instead
 * selects one of Redis's numbered logical databases and only ever flushes that
 * one (see reset-cache.ts). Redis exposes 16 (0-15) and INT_TEST_WORKERS is
 * capped at 8, so one index per worker always fits.
 */
export const workerRedisDatabase = (poolId: number) => poolId;

export const withDatabase = (connectionUri: string, database: string) => {
    const url = new URL(connectionUri);

    url.pathname = `/${database}`;

    return url.toString();
};
