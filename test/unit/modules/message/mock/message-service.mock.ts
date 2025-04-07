import { FastifyBaseLogger } from "fastify";
import { EnvConfig } from "@/types/env.type.js";
import { mockDeep } from "vitest-mock-extended";
import { createService } from "@/modules/message/message.service.js";
import { MessageRepository } from "@/database/repositories/message/message.repository.js";

const mockMessageRepository = mockDeep<MessageRepository>();
const mockLog = mockDeep<FastifyBaseLogger>();

const mockConfig = {
    NODE_ENV: "test",
} as EnvConfig;

const messageService = createService(
    mockMessageRepository,
    mockLog,
    mockConfig
);

export { messageService, mockMessageRepository, mockLog, mockConfig };
