import { FastifyReply, FastifyRequest } from "fastify";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { ApplicationService } from "./application.service.js";

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
