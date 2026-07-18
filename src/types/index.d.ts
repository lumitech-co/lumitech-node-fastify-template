import { AwilixContainer } from "awilix";
import { EnvConfig } from "./env.type.js";
import { PrismaClient } from "@prisma/client";
import { Storage } from "@google-cloud/storage";
import { Cradle } from "./di-container.type.js";

declare module "fastify" {
    export interface FastifyInstance {
        config: EnvConfig;
        prisma: PrismaClient;
        di: AwilixContainer<Cradle>;
        gcpStorageClient: Storage;
    }
}
