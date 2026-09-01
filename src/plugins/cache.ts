import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { createRouteCacheKey } from "@/lib/cache/cache.util.js";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import { cachedResponseSchema } from "@/lib/validation/cache/cache.schema.js";
import {
    CACHEABLE_METHODS,
    CACHEABLE_STATUS_CODE,
    CACHE_DEFAULT_CONTENT_TYPE,
    CACHE_DEFAULT_TTL_SECONDS,
    CACHE_STATUS_HEADER,
    CACHE_STATUS_HIT,
    CACHE_STATUS_MISS,
} from "@/lib/cache/cache.constant.js";

const configureCache = async (fastify: FastifyInstance) => {
    const cacheService = fastify.di.resolve("cacheService");

    fastify.decorateRequest("cacheState", null);

    fastify.addHook("preHandler", async (request, reply) => {
        const options = request.routeOptions.config.cache;

        if (
            !options ||
            !CACHEABLE_METHODS.includes(request.method) ||
            options.enabled?.(request) === false
        ) {
            return;
        }

        const key = createRouteCacheKey({ request, options });

        const cached = await cacheService.get({
            key,
            schema: cachedResponseSchema,
        });

        if (!cached) {
            request.cacheState = {
                key,
                ttl: options.ttl ?? CACHE_DEFAULT_TTL_SECONDS,
            };

            reply.header(CACHE_STATUS_HEADER, CACHE_STATUS_MISS);

            return;
        }

        reply.header(CACHE_STATUS_HEADER, CACHE_STATUS_HIT);
        reply.type(cached.contentType);
        reply.send(cached.payload);

        return reply;
    });

    fastify.addHook("onSend", async (request, reply, payload) => {
        const state = request.cacheState;

        if (
            !state ||
            reply.statusCode !== CACHEABLE_STATUS_CODE ||
            typeof payload !== "string"
        ) {
            return payload;
        }

        await cacheService.set({
            key: state.key,
            ttl: state.ttl,
            value: {
                payload,
                contentType: String(
                    reply.getHeader("content-type") ??
                        CACHE_DEFAULT_CONTENT_TYPE
                ),
            },
        });

        return payload;
    });
};

export default fp(configureCache, {
    dependencies: [FastifyPlugin.Awilix, FastifyPlugin.Redis],
});
