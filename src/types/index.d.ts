import { AwilixContainer } from "awilix"; // 🛑 You forgot to bring this!
import { EnvConfig } from "./env.type.js";
import { PrismaClient } from "@prisma/client";
import { Cradle } from "./di-container.type.js";
import { DiResolversValues } from "@/lib/awilix/di-resolvers.js";

declare module "fastify" {
    export interface FastifyInstance {
        config: EnvConfig;
        prisma: PrismaClient;
        di: AwilixContainer<Cradle> & {
            resolve<T extends DiResolversValues>(name: T): Cradle[T];
        };
    }
}
