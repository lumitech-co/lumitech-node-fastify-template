import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import { FastifyInstance } from "fastify";
import { RateLimitError } from "@/lib/errors/errors.js";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import {
    RATE_LIMIT_DEFAULT_MAX,
    RATE_LIMIT_DEFAULT_TIME_WINDOW,
    RATE_LIMIT_KEY_PREFIX,
} from "@/lib/constants/rateLimit.constant.js";

const configureRateLimit = async (fastify: FastifyInstance) => {
    await fastify.register(rateLimit, {
        global: true,
        max: RATE_LIMIT_DEFAULT_MAX,
        timeWindow: RATE_LIMIT_DEFAULT_TIME_WINDOW,
        redis: fastify.redis,
        nameSpace: RATE_LIMIT_KEY_PREFIX,
        skipOnError: true,
        keyGenerator: (request) => request.ip,
        errorResponseBuilder: (_request, context) =>
            new RateLimitError(
                `Rate limit exceeded, retry in ${context.after}`
            ),
    });
};

export default fp(configureRateLimit, {
    name: FastifyPlugin.RateLimit,
    dependencies: [FastifyPlugin.Env, FastifyPlugin.Redis],
});
