import { FastifyBaseLogger } from "fastify";
import { EnvConfig } from "@/types/env.type.js";
import { MessageJobResult } from "./mq/message.type.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { CacheService } from "@/lib/cache/cache.service.js";
import { MESSAGE_CACHE_NAMESPACE } from "./message.constant.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import { CreateMessagePayload, UpdateMessagePayload } from "./message.type.js";
import { MessageRepository } from "@/database/repositories/message/message.repository.js";
import {
    FetchMessagesQuery,
    FetchMessagesResponse,
    DeleteMessageJobData,
} from "@/lib/validation/message/message.schema.js";

export type MessageService = {
    createMessage: (payload: CreateMessagePayload) => Promise<MessageJobResult>;
    updateMessage: (payload: UpdateMessagePayload) => Promise<MessageJobResult>;
    deleteMessage: (payload: DeleteMessageJobData) => Promise<MessageJobResult>;
    getMessages: (query: FetchMessagesQuery) => Promise<FetchMessagesResponse>;
};

export const createService = (
    messageRepository: MessageRepository,
    cacheService: CacheService,
    log: FastifyBaseLogger,
    config: EnvConfig
): MessageService => ({
    createMessage: async ({ id, text, meta, enqueuedAt }) => {
        await messageRepository.createIfAbsent({
            id,
            text,
            meta,
            updatedAt: enqueuedAt,
        });

        await cacheService.invalidate({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });

        return { id };
    },

    updateMessage: async ({ id, text, meta, enqueuedAt }) => {
        const updated = await messageRepository.updateIfNotNewer({
            id,
            text,
            meta,
            updatedAt: enqueuedAt,
        });

        if (!updated) {
            return { id };
        }

        await cacheService.invalidate({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });

        return { id };
    },

    deleteMessage: async ({ id }) => {
        await messageRepository.deleteMany({ where: { id } });

        await cacheService.invalidate({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });

        return { id };
    },

    getMessages: async ({ cursor, limit }) => {
        log.info("Current environment: %s", config.NODE_ENV);

        const data = await messageRepository.findPage({ cursor, limit });

        return {
            message: RESPONSE_MESSAGES.message.fetched,
            data,
        };
    },
});

addDIResolverName(createService, "messageService");
