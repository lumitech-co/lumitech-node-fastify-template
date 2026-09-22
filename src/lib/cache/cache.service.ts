import { Redis } from "ioredis";
import { FastifyBaseLogger } from "fastify";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import {
    CACHE_INVALIDATION_SCAN_COUNT,
    CACHE_KEY_PREFIX,
    CACHE_LOCK_MAX_WAIT_MS,
    CACHE_LOCK_POLL_INTERVAL_MS,
    CACHE_LOCK_PREFIX,
    CACHE_LOCK_TTL_MS,
} from "./cache.constant.js";
import {
    GetCachePayload,
    SetCachePayload,
    SleepPayload,
    WrapCachePayload,
    AcquireLockPayload,
    CacheLockState,
    CacheReadResult,
    RemoveCachePayload,
    InvalidateCachePayload,
} from "./cache.type.js";

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
    const service: CacheService = {
        get: async (payload) => (await read(payload)).value,

        set: async ({ key, value, ttl }) => {
            try {
                await redis.set(key, JSON.stringify(value), "EX", ttl);

                return true;
            } catch (error) {
                log.warn({ error, key }, "Cache write failed");

                return false;
            }
        },

        remove: async ({ key }) => {
            try {
                await redis.unlink(key);

                return true;
            } catch (error) {
                log.warn({ error, key }, "Cache removal failed");

                return false;
            }
        },

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
            const cached = await read({ key, schema });

            if (cached.hit) {
                return cached.value;
            }

            const lockKey = `${CACHE_LOCK_PREFIX}:${key}`;
            const lock = await acquireLock({ lockKey });

            if (lock === "taken") {
                const awaited = await waitForCache({ key, schema });

                if (awaited.hit) {
                    return awaited.value;
                }
            }

            try {
                const value = await resolver();

                await service.set({ key, value, ttl });

                return value;
            } finally {
                if (lock === "acquired") {
                    await service.remove({ key: lockKey });
                }
            }
        },
    };

    const read = async <T>({
        key,
        schema,
    }: GetCachePayload<T>): Promise<CacheReadResult<T>> => {
        try {
            const raw = await redis.get(key);

            if (raw === null) {
                return { hit: false, value: null };
            }

            const value = JSON.parse(raw);

            return { hit: true, value: schema ? schema.parse(value) : value };
        } catch (error) {
            log.warn({ error, key }, "Cache read failed");

            return { hit: false, value: null };
        }
    };

    const acquireLock = async ({
        lockKey,
    }: AcquireLockPayload): Promise<CacheLockState> => {
        try {
            const result = await redis.set(
                lockKey,
                "1",
                "PX",
                CACHE_LOCK_TTL_MS,
                "NX"
            );

            return result === "OK" ? "acquired" : "taken";
        } catch (error) {
            log.warn({ error, lockKey }, "Cache lock acquisition failed");

            return "unavailable";
        }
    };

    const waitForCache = async <T>({
        key,
        schema,
    }: GetCachePayload<T>): Promise<CacheReadResult<T>> => {
        const deadline = Date.now() + CACHE_LOCK_MAX_WAIT_MS;

        while (Date.now() < deadline) {
            await sleep({ ms: CACHE_LOCK_POLL_INTERVAL_MS });

            const cached = await read({ key, schema });

            if (cached.hit) {
                return cached;
            }
        }

        return { hit: false, value: null };
    };

    return service;
};

const sleep = ({ ms }: SleepPayload): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

addDIResolverName(createCacheService, "cacheService");
