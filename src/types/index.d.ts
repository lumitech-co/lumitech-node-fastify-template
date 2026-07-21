import { AwilixContainer } from "awilix";
import { EnvConfig } from "./env.type.js";
import { Cradle } from "./di-container.type.js";
import { Database } from "@/database/drizzle/drizzle.type.js";

declare module "fastify" {
    export interface FastifyInstance {
        config: EnvConfig;
        db: Database;
        di: AwilixContainer<Cradle>;
    }
}
