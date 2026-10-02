import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { Redis, RedisOptions } from "ioredis";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import {
    BULLMQ_CONNECT_TIMEOUT_MS,
    BULLMQ_KEEP_ALIVE_MS,
    BULLMQ_MAX_RETRIES_PER_REQUEST,
    BULLMQ_PRODUCER_MAX_RETRIES_PER_REQUEST,
    BULLMQ_RETRY_BACKOFF_MAX_MS,
    BULLMQ_RETRY_BACKOFF_STEP_MS,
} from "@/lib/constants/bullmq.constant.js";

const configureBullMq = async (fastify: FastifyInstance) => {
    const createConnection = (options: RedisOptions) => {
        const connection = new Redis(fastify.config.REDIS_URL, {
            lazyConnect: true,
            connectTimeout: BULLMQ_CONNECT_TIMEOUT_MS,
            keepAlive: BULLMQ_KEEP_ALIVE_MS,
            retryStrategy: (times) =>
                Math.min(
                    times * BULLMQ_RETRY_BACKOFF_STEP_MS,
                    BULLMQ_RETRY_BACKOFF_MAX_MS
                ),
            ...options,
        });

        connection.on("error", (error) => {
            fastify.log.error({ error }, "BullMQ connection error");
        });

        connection.connect().catch(() => {});

        return connection;
    };

    fastify.decorate(
        "bullmqConnection",
        createConnection({
            enableOfflineQueue: true,
            maxRetriesPerRequest: BULLMQ_MAX_RETRIES_PER_REQUEST,
        })
    );

    fastify.decorate(
        "bullmqProducerConnection",
        createConnection({
            enableOfflineQueue: false,
            maxRetriesPerRequest: BULLMQ_PRODUCER_MAX_RETRIES_PER_REQUEST,
        })
    );

    fastify.addHook("onClose", async (fastify) => {
        await Promise.all(
            [fastify.bullmqConnection, fastify.bullmqProducerConnection].map(
                async (connection) => {
                    try {
                        await connection.quit();
                    } catch {
                        connection.disconnect();
                    }
                }
            )
        );
    });
};

export default fp(configureBullMq, {
    name: FastifyPlugin.BullMq,
    dependencies: [FastifyPlugin.Env],
});
