import os from "node:os";

export const INT_TEST_WORKERS = Number(
    process.env.INT_TEST_WORKERS ??
        Math.max(1, Math.min(os.cpus().length - 1, 8))
);

export const TEMPLATE_DATABASE = "int_test_template";

export const workerDatabaseName = (poolId: number) => `int_test_w${poolId}`;

export const workerRedisDatabase = (poolId: number) => poolId;

export const withDatabase = (connectionUri: string, database: string) => {
    const url = new URL(connectionUri);

    url.pathname = `/${database}`;

    return url.toString();
};
