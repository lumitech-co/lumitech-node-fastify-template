import { addDIResolverName } from "@/lib/awilix/awilix.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ApplicationService } from "./application.service.js";

export type ApplicationHandler = {
    healthChecker: (
        request: FastifyRequest,
        reply: FastifyReply
    ) => Promise<void>;
};

export const createHandler = (
    applicationService: ApplicationService
): ApplicationHandler => {
    return {
        healthChecker: async (_request, reply) => {
            const data = await applicationService.healthChecker();

            return reply.send(data);
        },
    };
};

addDIResolverName(createHandler, "applicationHandler");
