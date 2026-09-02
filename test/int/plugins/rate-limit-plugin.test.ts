import fp from "fastify-plugin";
import { Redis } from "ioredis";
import Fastify, { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import rateLimitPlugin from "@/plugins/rateLimit.js";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import { RATE_LIMIT_DEFAULT_MAX } from "@/lib/constants/rateLimit.constant.js";

const RATE_LIMIT_HEADER = "x-ratelimit-limit";

const ROUTE_LIMIT_MAX = 2;

const buildApp = async (redis: Redis) => {
    const app = Fastify();

    await app.register(fp(async () => {}, { name: FastifyPlugin.Env }));

    await app.register(
        fp(
            async (instance) => {
                instance.decorate("redis", redis);
            },
            { name: FastifyPlugin.Redis }
        )
    );

    await app.register(rateLimitPlugin);

    app.get("/default", async () => ({ ok: true }));

    app.get(
        "/limited",
        {
            config: {
                rateLimit: { max: ROUTE_LIMIT_MAX, timeWindow: "1 minute" },
            },
        },
        async () => ({ ok: true })
    );

    app.get("/exempt", { config: { rateLimit: false } }, async () => ({
        ok: true,
    }));

    await app.ready();

    return app;
};

describe("rate-limit plugin", () => {
    let app: FastifyInstance;
    let redis: Redis;

    beforeEach(async () => {
        redis = new Redis(process.env.REDIS_URL as string);
        app = await buildApp(redis);
    });

    afterEach(async () => {
        await app.close();
        await redis.quit();
    });

    it("should apply the global default limit to routes without config", async () => {
        const response = await app.inject({ method: "GET", url: "/default" });

        expect(response.statusCode).toBe(200);
        expect(response.headers[RATE_LIMIT_HEADER]).toBe(
            String(RATE_LIMIT_DEFAULT_MAX)
        );
    });

    it("should allow requests up to the per-route limit then return 429", async () => {
        const first = await app.inject({ method: "GET", url: "/limited" });
        const second = await app.inject({ method: "GET", url: "/limited" });
        const third = await app.inject({ method: "GET", url: "/limited" });

        expect(first.statusCode).toBe(200);
        expect(first.headers[RATE_LIMIT_HEADER]).toBe(String(ROUTE_LIMIT_MAX));
        expect(second.statusCode).toBe(200);
        expect(third.statusCode).toBe(429);
    });

    it("should shape the 429 body like the rest of the app's errors", async () => {
        await app.inject({ method: "GET", url: "/limited" });
        await app.inject({ method: "GET", url: "/limited" });
        const blocked = await app.inject({ method: "GET", url: "/limited" });

        expect(blocked.statusCode).toBe(429);
        expect(blocked.json()).toMatchObject({
            statusCode: 429,
            message: expect.stringContaining("Rate limit exceeded"),
        });
    });

    it("should never limit a route that opts out with rateLimit: false", async () => {
        const responses = await Promise.all(
            Array.from({ length: ROUTE_LIMIT_MAX + 3 }, () =>
                app.inject({ method: "GET", url: "/exempt" })
            )
        );

        for (const response of responses) {
            expect(response.statusCode).toBe(200);
            expect(response.headers[RATE_LIMIT_HEADER]).toBeUndefined();
        }
    });
});

describe("rate-limit plugin fail-open", () => {
    let app: FastifyInstance;
    let redis: Redis;

    beforeEach(async () => {
        redis = new Redis({
            host: "127.0.0.1",
            port: 6390,
            lazyConnect: true,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
        });
        redis.on("error", () => {});

        app = await buildApp(redis);
    });

    afterEach(async () => {
        await app.close();
        redis.disconnect();
    });

    it("should allow requests when Redis is unreachable (skipOnError)", async () => {
        const first = await app.inject({ method: "GET", url: "/limited" });
        const second = await app.inject({ method: "GET", url: "/limited" });
        const third = await app.inject({ method: "GET", url: "/limited" });

        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(200);
        expect(third.statusCode).toBe(200);
    });
});
