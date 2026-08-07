import { Redis } from "ioredis";

/**
 * Redis is shared across the whole test process, unlike the per-test Postgres
 * schema. Flush it before each test so a cached response from one test can never
 * leak into the next as a stale HIT.
 */
export const flushCache = async (): Promise<void> => {
    if (!process.env.REDIS_URL) {
        return;
    }

    const redis = new Redis(process.env.REDIS_URL);

    try {
        await redis.flushdb();
    } finally {
        await redis.quit();
    }
};
