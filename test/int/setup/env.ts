import { inject } from "vitest";
import {
    withDatabase,
    workerDatabaseName,
    workerRedisDatabase,
} from "./workers.js";

const poolId = Number(process.env.VITEST_POOL_ID ?? 1);

process.env.DATABASE_URL = withDatabase(
    inject("databaseUri"),
    workerDatabaseName(poolId)
);

if (process.env.REDIS_URL) {
    process.env.REDIS_URL = withDatabase(
        process.env.REDIS_URL,
        String(workerRedisDatabase(poolId))
    );
}
