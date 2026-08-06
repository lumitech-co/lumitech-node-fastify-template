import fp from "fastify-plugin";
import fastifyCors from "@fastify/cors";
import { FastifyInstance } from "fastify";
import {
    CORS_ALLOWED_METHODS,
    CORS_EMPTY_ORIGINS_ERROR,
    CORS_EXPOSED_HEADERS,
    CORS_MAX_AGE_SECONDS,
    CORS_WILDCARD_ORIGIN,
    CORS_WILDCARD_ORIGIN_ERROR,
} from "@/lib/constants/cors.constant.js";

const normalizeOrigin = (origin: string) =>
    origin.trim().replace(/\/+$/, "").toLowerCase();

const configureCors = async (fastify: FastifyInstance) => {
    const corsOrigins = new Set(
        fastify.config.CORS_ORIGINS.split(",")
            .map(normalizeOrigin)
            .filter(Boolean)
    );

    if (corsOrigins.size === 0) {
        throw new Error(CORS_EMPTY_ORIGINS_ERROR);
    }

    if (corsOrigins.has(CORS_WILDCARD_ORIGIN)) {
        throw new Error(CORS_WILDCARD_ORIGIN_ERROR);
    }

    await fastify.register(fastifyCors, {
        origin(origin, callback) {
            if (!origin || corsOrigins.has(normalizeOrigin(origin))) {
                callback(null, true);

                return;
            }

            callback(null, false);
        },
        credentials: true,
        methods: CORS_ALLOWED_METHODS,
        exposedHeaders: CORS_EXPOSED_HEADERS,
        maxAge: CORS_MAX_AGE_SECONDS,
    });
};

export default fp(configureCors, {});
