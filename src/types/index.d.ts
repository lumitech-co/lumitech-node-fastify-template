import { EnvConfig } from "./env.type.js";
import { PrismaClient } from "@prisma/client";
import { Cradle } from "./di-cointainer.type.js";
import { DiResolversValues } from "@/lib/awilix/di-resolvers.js";

declare module "fastify" {
    export interface FastifyInstance {
        config: EnvConfig;
        prisma: PrismaClient;
        di: {
            resolve<T extends DiResolversValues>(name: T): Cradle[T];
        };
    }
}
