import { FastifyInstance } from "fastify";
import { ApplicationHandler } from "./application.handler.js";
import { healthCheckResponseSchema } from "@/lib/validation/application/application.schema.js";

const APPLICATION_TAG = "application";

enum ApplicationRoute {
    HealthCheck = "/ping",
}

export const createApplicationRoutes = (
    fastify: FastifyInstance,
    applicationHandler: ApplicationHandler
) => {
    fastify.get(
        ApplicationRoute.HealthCheck,
        {
            config: {
                rateLimit: false,
            },
            schema: {
                tags: [APPLICATION_TAG],
                summary: "Check application health status",
                response: {
                    200: healthCheckResponseSchema,
                },
            },
        },
        applicationHandler.healthChecker
    );
};
