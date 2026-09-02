import fp from "fastify-plugin";
import { Redis } from "ioredis";
import { FastifyInstance } from "fastify";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import {
    BULLMQ_CONNECT_TIMEOUT_MS,
    BULLMQ_KEEP_ALIVE_MS,
    BULLMQ_MAX_RETRIES_PER_REQUEST,
    BULLMQ_RETRY_BACKOFF_MAX_MS,
    BULLMQ_RETRY_BACKOFF_STEP_MS,
} from "@/lib/constants/bullmq.constant.js";

const configureBullMq = async (fastify: FastifyInstance) => {
    const connection = new Redis(fastify.config.REDIS_URL, {
        lazyConnect: true,
        connectTimeout: BULLMQ_CONNECT_TIMEOUT_MS,
        keepAlive: BULLMQ_KEEP_ALIVE_MS,
        enableOfflineQueue: true,
        maxRetriesPerRequest: BULLMQ_MAX_RETRIES_PER_REQUEST,
        retryStrategy: (times) =>
            Math.min(
                times * BULLMQ_RETRY_BACKOFF_STEP_MS,
                BULLMQ_RETRY_BACKOFF_MAX_MS
            ),
    });

    connection.on("error", (error) => {
        fastify.log.error({ error }, "BullMQ connection error");
    });

    connection.connect().catch(() => {});

    fastify.decorate("bullmqConnection", connection);

    fastify.addHook("onClose", async (fastify) => {
        try {
            await fastify.bullmqConnection.quit();
        } catch {
            fastify.bullmqConnection.disconnect();
        }
    });
};

export default fp(configureBullMq, {
    name: FastifyPlugin.BullMq,
    dependencies: [FastifyPlugin.Env],
});
