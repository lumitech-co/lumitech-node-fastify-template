import type { Queue } from "bullmq";
import type { Redis } from "ioredis";
import type { AwilixContainer } from "awilix";
import type { EnvConfig } from "./env.type.js";
import type { S3Client } from "@aws-sdk/client-s3";
import type { PrismaClient } from "@prisma/client";
import type { Storage } from "@google-cloud/storage";
import type { Cradle } from "./di-container.type.js";
import type { MessageJobData } from "@/modules/message/mq/message.type.js";
import type { MessageJobName } from "@/modules/message/mq/message.constant.js";
import type {
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
        bullmqProducerConnection: Redis;
        messageQueue: Queue<MessageJobData, unknown, MessageJobName>;
    }

    export interface FastifyContextConfig {
        cache?: RouteCacheOptions;
    }

    export interface FastifyRequest {
        cacheState: RequestCacheState | null;
    }
}
