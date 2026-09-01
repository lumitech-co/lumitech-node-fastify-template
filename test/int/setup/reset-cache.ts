import { Redis } from "ioredis";
import { beforeEach, afterAll } from "vitest";

let redis: Redis | null = null;

const getRedis = () => {
    if (redis) {
        return redis;
    }

    if (!process.env.REDIS_URL) {
        return null;
    }

    redis = new Redis(process.env.REDIS_URL);

    return redis;
};

/**
 * Redis is shared across the whole test process, unlike the per-worker Postgres
 * database. Each worker selects its own numbered logical database in env.ts, so
 * this flush clears only that worker's cache — a cached response from one test
 * can never leak into the next as a stale HIT, and parallel workers never flush
 * each other.
 */
beforeEach(async () => {
    const connection = getRedis();

    if (!connection) {
        return;
    }

    await connection.flushdb();
});

afterAll(async () => {
    await redis?.quit();

    redis = null;
});
