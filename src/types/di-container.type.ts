import type { Queue } from "bullmq";
import type { Redis } from "ioredis";
import type { EnvConfig } from "./env.type.js";
import type { FastifyBaseLogger } from "fastify";
import type { S3Client } from "@aws-sdk/client-s3";
import type { PrismaClient } from "@prisma/client";
import type { Storage } from "@google-cloud/storage";
import type { CacheService } from "@/lib/cache/cache.service.js";
import type { IpBanService } from "@/lib/ipBan/ipBan.service.js";
import type { S3BucketService } from "@/lib/s3Bucket/s3Bucket.service.js";
import type { MessageService } from "@/modules/message/message.service.js";
import type { MessageHandler } from "@/modules/message/message.handler.js";
import type { MessageJobData } from "@/modules/message/mq/message.type.js";
import type { GcpBucketService } from "@/lib/gcpBucket/gcpBucket.service.js";
import type { MessageJobName } from "@/modules/message/mq/message.constant.js";
import type { MessageJobService } from "@/modules/message/mq/message.service.js";
import type { ApplicationService } from "@/modules/application/application.service.js";
import type { ApplicationHandler } from "@/modules/application/application.handler.js";
import type { MessageRepository } from "@/database/repositories/message/message.repository.js";

export type Cradle = {
    log: FastifyBaseLogger;
    prisma: PrismaClient;
    config: EnvConfig;
    gcpStorageClient: Storage;
    awsS3Client: S3Client;
    redis: Redis;
    bullmqConnection: Redis;
    messageQueue: Queue<MessageJobData, unknown, MessageJobName>;

    applicationService: ApplicationService;
    applicationHandler: ApplicationHandler;

    messageRepository: MessageRepository;
    messageService: MessageService;
    messageJobService: MessageJobService;
    messageHandler: MessageHandler;

    cacheService: CacheService;
    ipBanService: IpBanService;
    gcpBucketService: GcpBucketService;
    s3BucketService: S3BucketService;
};
