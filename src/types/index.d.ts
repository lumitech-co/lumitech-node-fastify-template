import { AwilixContainer } from "awilix";
import { EnvConfig } from "./env.type.js";
import { PrismaClient } from "@prisma/client";
import { Cradle } from "./di-container.type.ts";

declare module "fastify" {
    // Enhance the Fastify instance with additional properties
    // e.g. "authenticate" decorator.
    export interface FastifyInstance {
        config: EnvConfig;
        prisma: PrismaClient;
        di: AwilixContainer<Cradle>;
    }
}
