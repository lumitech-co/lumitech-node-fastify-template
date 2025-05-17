import { EnvConfig } from "./env.type.js";
import { FastifyBaseLogger } from "fastify";
import { PrismaClient } from "@prisma/client/extension";
import { MessageService } from "@/modules/message/message.service.js";
import { MessageHandler } from "@/modules/message/message.handler.js";
import { MessageRepository } from "@/database/repositories/message/message.repository.js";

export type Cradle = {
    log: FastifyBaseLogger;
    prisma: PrismaClient;
    config: EnvConfig;

    messageRepository: MessageRepository;
    messageService: MessageService;
    messageHandler: MessageHandler;
};
