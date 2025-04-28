import { AwilixContainer } from "awilix";
import { EnvConfig } from "./env.type.js";
import { PrismaClient } from "@prisma/client";
import { Cradle } from "./di-container.type.js";
import { DIResolversValues } from "@/lib/awilix/di-resolvers.js";

declare module "fastify" {
    export interface FastifyInstance {
        config: EnvConfig;
        prisma: PrismaClient;
        di: AwilixContainer<Cradle> & {
            resolve<T extends DIResolversValues>(name: T): Cradle[T];
        };
    }
}
