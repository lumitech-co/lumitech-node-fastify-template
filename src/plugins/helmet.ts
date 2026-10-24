import fp from "fastify-plugin";
import fastifyHelmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";
import { SWAGGER_ROUTE_PREFIX } from "@/lib/constants/swagger.constant.js";
import {
    HELMET_DOCS_CONTENT_SECURITY_POLICY,
    HELMET_HSTS_MAX_AGE_SECONDS,
    HELMET_PERMISSIONS_POLICY,
} from "@/lib/constants/helmet.constant.js";

const configureHelmet = async (fastify: FastifyInstance): Promise<void> => {
    await fastify.register(fastifyHelmet, {
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                "default-src": ["'none'"],
                "frame-ancestors": ["'none'"],
                "base-uri": ["'none'"],
                "form-action": ["'none'"],
                "object-src": ["'none'"],
            },
        },
        strictTransportSecurity: {
            maxAge: HELMET_HSTS_MAX_AGE_SECONDS,
            includeSubDomains: true,
        },
        xContentTypeOptions: true,
        xFrameOptions: { action: "deny" },
        referrerPolicy: { policy: "no-referrer" },
        crossOriginOpenerPolicy: { policy: "same-origin" },
        crossOriginResourcePolicy: { policy: "same-origin" },
    });

    // Runs after helmet's own onRequest hook, so the Swagger UI policy wins
    // over the API-wide one on the docs routes.
    fastify.addHook("onRequest", async (request, reply) => {
        reply.header("permissions-policy", HELMET_PERMISSIONS_POLICY);

        if (request.url.startsWith(SWAGGER_ROUTE_PREFIX)) {
            reply.header(
                "content-security-policy",
                HELMET_DOCS_CONTENT_SECURITY_POLICY
            );
        }
    });
};

export default fp(configureHelmet, {});
