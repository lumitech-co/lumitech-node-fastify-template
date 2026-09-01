import fp from "fastify-plugin";
import { Redis } from "ioredis";
import { FastifyInstance } from "fastify";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import {
    REDIS_COMMAND_TIMEOUT_MS,
    REDIS_CONNECT_TIMEOUT_MS,
    REDIS_KEEP_ALIVE_MS,
    REDIS_MAX_RETRIES_PER_REQUEST,
    REDIS_RETRY_BACKOFF_MAX_MS,
    REDIS_RETRY_BACKOFF_STEP_MS,
} from "@/lib/constants/redis.constant.js";

const configureRedis = async (fastify: FastifyInstance) => {
    const redis = new Redis(fastify.config.REDIS_URL, {
        lazyConnect: true,
        connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
        commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
        keepAlive: REDIS_KEEP_ALIVE_MS,
        enableOfflineQueue: false,
        maxRetriesPerRequest: REDIS_MAX_RETRIES_PER_REQUEST,
        retryStrategy: (times) =>
            Math.min(
                times * REDIS_RETRY_BACKOFF_STEP_MS,
                REDIS_RETRY_BACKOFF_MAX_MS
            ),
    });

    redis.on("error", (error) => {
        fastify.log.error({ error }, "Redis connection error");
    });

    redis.connect().catch(() => {});

    fastify.decorate("redis", redis);

    fastify.addHook("onClose", async (fastify) => {
        try {
            await fastify.redis.quit();
        } catch {
            fastify.redis.disconnect();
        }
    });
};

export default fp(configureRedis, {
    name: FastifyPlugin.Redis,
    dependencies: [FastifyPlugin.Env],
});
