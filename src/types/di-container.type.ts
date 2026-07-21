import { EnvConfig } from "./env.type.js";
import { FastifyBaseLogger } from "fastify";
import { Database } from "@/database/drizzle/drizzle.type.js";
import { MessageService } from "@/modules/message/message.service.js";
import { MessageHandler } from "@/modules/message/message.handler.js";
import { ApplicationService } from "@/modules/application/application.service.js";
import { ApplicationHandler } from "@/modules/application/application.handler.js";
import { MessageRepository } from "@/database/repositories/message/message.repository.js";

export type Cradle = {
    log: FastifyBaseLogger;
    db: Database;
    config: EnvConfig;

    applicationService: ApplicationService;
    applicationHandler: ApplicationHandler;

    messageRepository: MessageRepository;
    messageService: MessageService;
    messageHandler: MessageHandler;
};
