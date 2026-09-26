import { Redis } from "ioredis";
import { FastifyBaseLogger } from "fastify";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import {
    GetCachePayload,
    SetCachePayload,
    SleepPayload,
    WrapCachePayload,
    AcquireLockPayload,
    RemoveCachePayload,
    InvalidateCachePayload,
} from "./cache.type.js";
import {
    CACHE_INVALIDATION_SCAN_COUNT,
    CACHE_KEY_PREFIX,
    CACHE_LOCK_MAX_WAIT_MS,
    CACHE_LOCK_POLL_INTERVAL_MS,
    CACHE_LOCK_PREFIX,
    CACHE_LOCK_TTL_MS,
} from "./cache.constant.js";

export type CacheService = {
    get: <T>(payload: GetCachePayload<T>) => Promise<T | null>;
    set: <T>(payload: SetCachePayload<T>) => Promise<boolean>;
    remove: (payload: RemoveCachePayload) => Promise<boolean>;
    invalidate: (payload: InvalidateCachePayload) => Promise<number>;
    wrap: <T>(payload: WrapCachePayload<T>) => Promise<T>;
};

export const createCacheService = (
    redis: Redis,
    log: FastifyBaseLogger
): CacheService => {
    return {
        get,
        set,
        remove,

        invalidate: async ({ namespace }) => {
            const pattern = `${CACHE_KEY_PREFIX}:${namespace}:*`;

            try {
                let cursor = "0";
                let removed = 0;

                do {
                    const [nextCursor, keys] = await redis.scan(
                        cursor,
                        "MATCH",
                        pattern,
                        "COUNT",
                        CACHE_INVALIDATION_SCAN_COUNT
                    );

                    cursor = nextCursor;

                    if (keys.length > 0) {
                        await redis.unlink(...keys);

                        removed += keys.length;
                    }
                } while (cursor !== "0");

                return removed;
            } catch (error) {
                log.warn({ error, pattern }, "Cache invalidation failed");

                return 0;
            }
        },

        wrap: async ({ key, ttl, resolver, schema }) => {
            const cached = await get({ key, schema });

            if (cached !== null) {
                return cached;
            }

            const lockKey = `${CACHE_LOCK_PREFIX}:${key}`;
            const acquired = await acquireLock({ lockKey });

            if (!acquired) {
                const awaited = await waitForCache({ key, schema });

                if (awaited !== null) {
                    return awaited;
                }
            }

            try {
                const value = await resolver();

                await set({ key, value, ttl });

                return value;
            } finally {
                if (acquired) {
                    await remove({ key: lockKey });
                }
            }
        },
    };

    async function get<T>({
        key,
        schema,
    }: GetCachePayload<T>): Promise<T | null> {
        try {
            const raw = await redis.get(key);

            if (!raw) {
                return null;
            }

            const value = JSON.parse(raw);

            return schema ? schema.parse(value) : value;
        } catch (error) {
            log.warn({ error, key }, "Cache read failed");

            return null;
        }
    }

    async function set<T>({
        key,
        value,
        ttl,
    }: SetCachePayload<T>): Promise<boolean> {
        try {
            await redis.set(key, JSON.stringify(value), "EX", ttl);

            return true;
        } catch (error) {
            log.warn({ error, key }, "Cache write failed");

            return false;
        }
    }

    async function remove({ key }: RemoveCachePayload): Promise<boolean> {
        try {
            await redis.unlink(key);

            return true;
        } catch (error) {
            log.warn({ error, key }, "Cache removal failed");

            return false;
        }
    }

    async function acquireLock({
        lockKey,
    }: AcquireLockPayload): Promise<boolean> {
        try {
            const result = await redis.set(
                lockKey,
                "1",
                "PX",
                CACHE_LOCK_TTL_MS,
                "NX"
            );

            return result === "OK";
        } catch (error) {
            log.warn({ error, lockKey }, "Cache lock acquisition failed");

            return true;
        }
    }

    async function waitForCache<T>({
        key,
        schema,
    }: GetCachePayload<T>): Promise<T | null> {
        const deadline = Date.now() + CACHE_LOCK_MAX_WAIT_MS;

        while (Date.now() < deadline) {
            await sleep({ ms: CACHE_LOCK_POLL_INTERVAL_MS });

            const cached = await get({ key, schema });

            if (cached !== null) {
                return cached;
            }
        }

        return null;
    }
};

function sleep({ ms }: SleepPayload): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

addDIResolverName(createCacheService, "cacheService");
