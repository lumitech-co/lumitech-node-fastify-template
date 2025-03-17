import { EnvConfig } from "./env.type";
import { AwilixContainer } from "awilix";
import { Cradle } from "@fastify/awilix";
import { PrismaClient } from "@prisma/client";

declare module "fastify" {
    // Enhance the Fastify instance with additional properties
    // e.g. "authenticate" decorator.
    export interface FastifyInstance {
        config: EnvConfig;
        prisma: PrismaClient;
        di: AwilixContainer<Cradle>;
    }
}

declare module "@fastify/awilix" {
    interface Cradle {
        log: FastifyBaseLogger;
        prisma: PrismaClient;
        config: EnvConfig;

        messageService: MessageService;
        messageHandler: MessageHandler;
    }
}
