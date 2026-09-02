import { Redis } from "ioredis";
import { AwilixContainer } from "awilix";
import { EnvConfig } from "./env.type.js";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { Storage } from "@google-cloud/storage";
import { Cradle } from "./di-container.type.js";
import {
    RequestCacheState,
    RouteCacheOptions,
} from "@/lib/cache/cache.type.js";

declare module "fastify" {
    export interface FastifyInstance {
        config: EnvConfig;
        prisma: PrismaClient;
        di: AwilixContainer<Cradle>;
        gcpStorageClient: Storage;
        awsS3Client: S3Client;
        redis: Redis;
        bullmqConnection: Redis;
    }

    export interface FastifyContextConfig {
        cache?: RouteCacheOptions;
    }

    export interface FastifyRequest {
        cacheState: RequestCacheState | null;
    }
}
