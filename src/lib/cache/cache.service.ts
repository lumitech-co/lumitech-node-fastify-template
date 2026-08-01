import { Redis } from "ioredis";
import { FastifyBaseLogger } from "fastify";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import {
    CACHE_INVALIDATION_SCAN_COUNT,
    CACHE_KEY_PREFIX,
} from "./cache.constant.js";
import {
    GetCachePayload,
    SetCachePayload,
    WrapCachePayload,
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
        get: async ({ key, schema }) => {
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
        },

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
            const cached = await service.get({ key, schema });

            if (cached !== null) {
                return cached;
            }

            const value = await resolver();

            await service.set({ key, value, ttl });

            return value;
        },
    };

    return service;
};

addDIResolverName(createCacheService, "cacheService");
