import { Redis } from "ioredis";
import { AwilixContainer } from "awilix";
import { EnvConfig } from "./env.type.js";
import { S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { Storage } from "@google-cloud/storage";
import { Cradle } from "./di-container.type.js";

declare module "fastify" {
    export interface FastifyInstance {
        config: EnvConfig;
        prisma: PrismaClient;
        di: AwilixContainer<Cradle>;
        gcpStorageClient: Storage;
        awsS3Client: S3Client;
        redis: Redis;
    }
}
