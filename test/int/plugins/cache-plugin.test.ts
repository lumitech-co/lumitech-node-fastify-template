import fp from "fastify-plugin";
import { Redis } from "ioredis";
import Fastify, { FastifyInstance } from "fastify";
import { beforeEach, describe, expect, it } from "vitest";
import cachePlugin from "@/plugins/cache.js";
import { createCacheService } from "@/lib/cache/cache.service.js";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import {
    CACHE_STATUS_HEADER,
    CACHE_STATUS_HIT,
    CACHE_STATUS_MISS,
} from "@/lib/cache/cache.constant.js";

/**
 * Exercises the response-cache plugin's gating logic against a real Redis
 * (the per-worker logical database from the int setup). The application's own
 * routes only configure a plain cached GET, so behaviours like `enabled`,
 * method/status gating and `varyBy` isolation are covered here with purpose-
 * built routes rather than by adding cache configs to production code.
 */
const buildApp = async () => {
    const redis = new Redis(process.env.REDIS_URL as string);
    const app = Fastify();
    const cacheService = createCacheService(redis, app.log);

    await app.register(
        fp(
            async (instance) => {
                instance.decorate("di", {
                    resolve: () => cacheService,
                } as unknown as FastifyInstance["di"]);
            },
            { name: FastifyPlugin.Awilix }
        )
    );

    await app.register(
        fp(
            async (instance) => {
                instance.decorate("redis", redis);
            },
            { name: FastifyPlugin.Redis }
        )
    );

    await app.register(cachePlugin);

    const counters = { cached: 0, maybe: 0, vary: 0 };

    app.get("/cached", { config: { cache: { ttl: 60 } } }, async () => {
        counters.cached += 1;

        return { value: counters.cached };
    });

    app.post("/cached", { config: { cache: { ttl: 60 } } }, async () => ({
        ok: true,
    }));

    app.get("/error", { config: { cache: { ttl: 60 } } }, async (_r, reply) =>
        reply.code(500).send({ error: "boom" })
    );

    app.get(
        "/maybe",
        {
            config: {
                cache: {
                    ttl: 60,
                    enabled: (request) => request.headers["x-enable"] === "yes",
                },
            },
        },
        async () => {
            counters.maybe += 1;

            return { value: counters.maybe };
        }
    );

    app.get(
        "/vary",
        {
            config: {
                cache: {
                    ttl: 60,
                    varyBy: (request) =>
                        String(request.headers["x-user"] ?? ""),
                },
            },
        },
        async () => {
            counters.vary += 1;

            return { value: counters.vary };
        }
    );

    await app.ready();

    return { app, redis };
};

describe("response-cache plugin", () => {
    let app: FastifyInstance;
    let redis: Redis;

    beforeEach(async () => {
        ({ app, redis } = await buildApp());

        return async () => {
            await app.close();
            await redis.quit();
        };
    });

    it("should MISS then HIT a cacheable GET", async () => {
        const first = await app.inject({ method: "GET", url: "/cached" });
        const second = await app.inject({ method: "GET", url: "/cached" });

        expect(first.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(second.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_HIT);
        expect(second.json()).toEqual({ value: 1 });
    });

    it("should cache HEAD requests as well", async () => {
        const first = await app.inject({ method: "HEAD", url: "/cached" });
        const second = await app.inject({ method: "HEAD", url: "/cached" });

        expect(first.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(second.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_HIT);
    });

    it("should not cache non-GET/HEAD methods", async () => {
        const first = await app.inject({ method: "POST", url: "/cached" });
        const second = await app.inject({ method: "POST", url: "/cached" });

        expect(first.headers[CACHE_STATUS_HEADER]).toBeUndefined();
        expect(second.headers[CACHE_STATUS_HEADER]).toBeUndefined();
    });

    it("should not cache non-200 responses", async () => {
        const first = await app.inject({ method: "GET", url: "/error" });
        const second = await app.inject({ method: "GET", url: "/error" });

        expect(first.statusCode).toBe(500);
        expect(second.statusCode).toBe(500);
        expect(first.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(second.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
    });

    it("should bypass the cache when enabled() returns false", async () => {
        const first = await app.inject({ method: "GET", url: "/maybe" });
        const second = await app.inject({ method: "GET", url: "/maybe" });

        expect(first.headers[CACHE_STATUS_HEADER]).toBeUndefined();
        expect(second.headers[CACHE_STATUS_HEADER]).toBeUndefined();
        expect(first.json()).toEqual({ value: 1 });
        expect(second.json()).toEqual({ value: 2 });
    });

    it("should cache when enabled() returns true", async () => {
        const headers = { "x-enable": "yes" };

        const first = await app.inject({
            method: "GET",
            url: "/maybe",
            headers,
        });
        const second = await app.inject({
            method: "GET",
            url: "/maybe",
            headers,
        });

        expect(first.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(second.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_HIT);
        expect(second.json()).toEqual({ value: 1 });
    });

    it("should isolate cached entries per varyBy value", async () => {
        const alice = { "x-user": "alice" };
        const bob = { "x-user": "bob" };

        const aliceMiss = await app.inject({
            method: "GET",
            url: "/vary",
            headers: alice,
        });
        const aliceHit = await app.inject({
            method: "GET",
            url: "/vary",
            headers: alice,
        });
        const bobMiss = await app.inject({
            method: "GET",
            url: "/vary",
            headers: bob,
        });

        expect(aliceMiss.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(aliceHit.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_HIT);
        expect(aliceHit.json()).toEqual({ value: 1 });

        expect(bobMiss.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(bobMiss.json()).toEqual({ value: 2 });
    });
});
