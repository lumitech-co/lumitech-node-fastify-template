import { EnvConfig } from "./env.type.js";
import { FastifyBaseLogger } from "fastify";
import { PrismaClient } from "@prisma/client";
import { Storage } from "@google-cloud/storage";
import { MessageService } from "@/modules/message/message.service.js";
import { MessageHandler } from "@/modules/message/message.handler.js";
import { GcpBucketService } from "@/lib/gcpBucket/gcpBucket.service.js";
import { ApplicationService } from "@/modules/application/application.service.js";
import { ApplicationHandler } from "@/modules/application/application.handler.js";
import { MessageRepository } from "@/database/repositories/message/message.repository.js";

export type Cradle = {
    log: FastifyBaseLogger;
    prisma: PrismaClient;
    config: EnvConfig;
    gcpStorageClient: Storage;

    applicationService: ApplicationService;
    applicationHandler: ApplicationHandler;

    messageRepository: MessageRepository;
    messageService: MessageService;
    messageHandler: MessageHandler;

    gcpBucketService: GcpBucketService;
};
