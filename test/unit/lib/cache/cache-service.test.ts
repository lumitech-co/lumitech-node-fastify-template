import { z } from "zod";
import { Redis } from "ioredis";
import { FastifyBaseLogger } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { createCacheService } from "@/lib/cache/cache.service.js";
import {
    CACHE_INVALIDATION_SCAN_COUNT,
    CACHE_KEY_PREFIX,
    CACHE_LOCK_PREFIX,
} from "@/lib/cache/cache.constant.js";

const patternToRegex = (pattern: string): RegExp =>
    new RegExp(
        "^" +
            pattern.replace(/[.*+?^${}()|[\]\\]/g, (char) =>
                char === "*" ? ".*" : `\\${char}`
            ) +
            "$"
    );

const createFakeRedis = () => {
    const store = new Map<string, string>();

    const redis = {
        store,
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        set: vi.fn(
            async (
                key: string,
                value: string,
                ...args: (string | number)[]
            ) => {
                if (args.includes("NX") && store.has(key)) {
                    return null;
                }

                store.set(key, value);

                return "OK";
            }
        ),
        unlink: vi.fn(async (...keys: string[]) => {
            let removed = 0;

            for (const key of keys) {
                if (store.delete(key)) {
                    removed += 1;
                }
            }

            return removed;
        }),
        scan: vi.fn(
            async (
                cursor: string,
                _match: string,
                pattern: string,
                _count: string,
                count: number
            ): Promise<[string, string[]]> => {
                const regex = patternToRegex(pattern);
                const sorted = [...store.keys()].sort();
                const from =
                    cursor === "0"
                        ? 0
                        : sorted.findIndex((key) => key > cursor);
                const start = from === -1 ? sorted.length : from;
                const slice = sorted.slice(start, start + count);
                const next =
                    start + count >= sorted.length
                        ? "0"
                        : slice[slice.length - 1];

                return [next, slice.filter((key) => regex.test(key))];
            }
        ),
    };

    return redis;
};

const createFakeLogger = () =>
    ({ warn: vi.fn() }) as unknown as FastifyBaseLogger & {
        warn: ReturnType<typeof vi.fn>;
    };

const build = () => {
    const redis = createFakeRedis();
    const logger = createFakeLogger();
    const service = createCacheService(redis as unknown as Redis, logger);

    return { redis, logger, service };
};

describe("cache.service - get", () => {
    it("should return the parsed value on a hit", async () => {
        const { redis, service } = build();

        redis.store.set("key", JSON.stringify({ value: 1 }));

        expect(await service.get({ key: "key" })).toEqual({ value: 1 });
    });

    it("should return null on a miss", async () => {
        const { service } = build();

        expect(await service.get({ key: "absent" })).toBeNull();
    });

    it("should validate with the provided schema", async () => {
        const { redis, service } = build();
        const schema = z.object({ value: z.number() });

        redis.store.set("key", JSON.stringify({ value: 7 }));

        expect(await service.get({ key: "key", schema })).toEqual({ value: 7 });
    });

    it("should fall back to null and warn when the schema rejects", async () => {
        const { redis, logger, service } = build();
        const schema = z.object({ value: z.number() });

        redis.store.set("key", JSON.stringify({ value: "nope" }));

        expect(await service.get({ key: "key", schema })).toBeNull();
        expect(logger.warn).toHaveBeenCalledOnce();
    });

    it("should fall back to null and warn on malformed JSON", async () => {
        const { redis, logger, service } = build();

        redis.store.set("key", "{not json");

        expect(await service.get({ key: "key" })).toBeNull();
        expect(logger.warn).toHaveBeenCalledOnce();
    });

    it("should fall back to null and warn when redis throws", async () => {
        const { redis, logger, service } = build();

        redis.get.mockRejectedValueOnce(new Error("down"));

        expect(await service.get({ key: "key" })).toBeNull();
        expect(logger.warn).toHaveBeenCalledOnce();
    });
});

describe("cache.service - set", () => {
    it("should store the serialized value with a TTL and return true", async () => {
        const { redis, service } = build();

        const ok = await service.set({ key: "key", value: { a: 1 }, ttl: 30 });

        expect(ok).toBe(true);
        expect(redis.set).toHaveBeenCalledWith(
            "key",
            JSON.stringify({ a: 1 }),
            "EX",
            30
        );
    });

    it("should return false and warn when redis throws", async () => {
        const { redis, logger, service } = build();

        redis.set.mockRejectedValueOnce(new Error("down"));

        const ok = await service.set({ key: "key", value: 1, ttl: 30 });

        expect(ok).toBe(false);
        expect(logger.warn).toHaveBeenCalledOnce();
    });
});

describe("cache.service - remove", () => {
    it("should unlink the key and return true", async () => {
        const { redis, service } = build();

        redis.store.set("key", "1");

        expect(await service.remove({ key: "key" })).toBe(true);
        expect(redis.store.has("key")).toBe(false);
    });

    it("should return false and warn when redis throws", async () => {
        const { redis, logger, service } = build();

        redis.unlink.mockRejectedValueOnce(new Error("down"));

        expect(await service.remove({ key: "key" })).toBe(false);
        expect(logger.warn).toHaveBeenCalledOnce();
    });
});

describe("cache.service - invalidate", () => {
    it("should remove only keys in the namespace, paging through the cursor", async () => {
        const { redis, service } = build();
        const total = CACHE_INVALIDATION_SCAN_COUNT + 50;

        for (let index = 0; index < total; index += 1) {
            redis.store.set(`${CACHE_KEY_PREFIX}:message:${index}`, "1");
        }

        redis.store.set(`${CACHE_KEY_PREFIX}:other:1`, "1");

        const removed = await service.invalidate({ namespace: "message" });

        expect(removed).toBe(total);
        expect(redis.scan.mock.calls.length).toBeGreaterThan(1);
        expect(redis.store.has(`${CACHE_KEY_PREFIX}:other:1`)).toBe(true);
    });

    it("should return zero without unlinking when nothing matches", async () => {
        const { redis, service } = build();

        redis.store.set(`${CACHE_KEY_PREFIX}:other:1`, "1");

        expect(await service.invalidate({ namespace: "message" })).toBe(0);
        expect(redis.unlink).not.toHaveBeenCalled();
    });

    it("should return zero and warn when redis throws", async () => {
        const { redis, logger, service } = build();

        redis.scan.mockRejectedValueOnce(new Error("down"));

        expect(await service.invalidate({ namespace: "message" })).toBe(0);
        expect(logger.warn).toHaveBeenCalledOnce();
    });
});

describe("cache.service - wrap", () => {
    it("should short-circuit and skip the resolver on a cache hit", async () => {
        const { redis, service } = build();
        const resolver = vi.fn(async () => ({ value: "fresh" }));

        redis.store.set("key", JSON.stringify({ value: "cached" }));

        const result = await service.wrap({ key: "key", ttl: 30, resolver });

        expect(result).toEqual({ value: "cached" });
        expect(resolver).not.toHaveBeenCalled();
    });

    it("should run the resolver, cache the value and release the lock on a miss", async () => {
        const { redis, service } = build();
        const resolver = vi.fn(async () => ({ value: "fresh" }));

        const result = await service.wrap({ key: "key", ttl: 30, resolver });

        expect(result).toEqual({ value: "fresh" });
        expect(resolver).toHaveBeenCalledOnce();
        expect(redis.store.get("key")).toBe(JSON.stringify({ value: "fresh" }));
        expect(redis.store.has(`${CACHE_LOCK_PREFIX}:key`)).toBe(false);
    });

    it("should collapse concurrent misses into a single resolver call (single-flight)", async () => {
        const { service } = build();

        let releaseFirst: (value: { value: string }) => void = () => undefined;

        const firstResolver = vi.fn(
            () =>
                new Promise<{ value: string }>((resolve) => {
                    releaseFirst = resolve;
                })
        );
        const secondResolver = vi.fn(async () => ({ value: "second" }));

        const first = service.wrap({
            key: "key",
            ttl: 30,
            resolver: firstResolver,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        const second = service.wrap({
            key: "key",
            ttl: 30,
            resolver: secondResolver,
        });

        await new Promise((resolve) => setTimeout(resolve, 10));

        releaseFirst({ value: "first" });

        const [firstResult, secondResult] = await Promise.all([first, second]);

        expect(firstResult).toEqual({ value: "first" });
        expect(secondResult).toEqual({ value: "first" });
        expect(firstResolver).toHaveBeenCalledOnce();
        expect(secondResolver).not.toHaveBeenCalled();
    });

    it("should release the lock even when the resolver throws", async () => {
        const { redis, service } = build();
        const resolver = vi.fn(async () => {
            throw new Error("boom");
        });

        await expect(
            service.wrap({ key: "key", ttl: 30, resolver })
        ).rejects.toThrow("boom");

        expect(redis.store.has(`${CACHE_LOCK_PREFIX}:key`)).toBe(false);
    });

    it("should still resolve when lock acquisition errors (fail-open)", async () => {
        const { redis, logger, service } = build();
        const resolver = vi.fn(async () => ({ value: "fresh" }));

        redis.set.mockRejectedValueOnce(new Error("lock down"));

        const result = await service.wrap({ key: "key", ttl: 30, resolver });

        expect(result).toEqual({ value: "fresh" });
        expect(resolver).toHaveBeenCalledOnce();
        expect(logger.warn).toHaveBeenCalledOnce();
    });
});
