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
