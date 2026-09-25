import { FastifyBaseLogger } from "fastify";
import { EnvConfig } from "@/types/env.type.js";
import { MessageJobResult } from "./mq/message.type.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { CacheService } from "@/lib/cache/cache.service.js";
import { MESSAGE_CACHE_NAMESPACE } from "./message.constant.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import {
    messageIdSelect,
    messageListSelect,
    MessageRepository,
} from "@/database/repositories/message/message.repository.js";
import {
    FetchMessagesQuery,
    FetchMessagesResponse,
    CreateMessageJobData,
    DeleteMessageJobData,
    UpdateMessageJobData,
} from "@/lib/validation/message/message.schema.js";

export type MessageService = {
    createMessage: (payload: CreateMessageJobData) => Promise<MessageJobResult>;
    updateMessage: (payload: UpdateMessageJobData) => Promise<MessageJobResult>;
    deleteMessage: (payload: DeleteMessageJobData) => Promise<MessageJobResult>;
    getMessages: (query: FetchMessagesQuery) => Promise<FetchMessagesResponse>;
};

export const createService = (
    messageRepository: MessageRepository,
    cacheService: CacheService,
    log: FastifyBaseLogger,
    config: EnvConfig
): MessageService => ({
    createMessage: async ({ text, meta }) => {
        const message = await messageRepository.create({
            data: { text, meta },
            select: messageIdSelect,
        });

        await cacheService.invalidate({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });

        return { id: message.id };
    },

    updateMessage: async ({ id, text, meta }) => {
        const message = await messageRepository.update({
            where: { id },
            data: { text, meta },
            select: messageIdSelect,
        });

        await cacheService.invalidate({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });

        return { id: message.id };
    },

    deleteMessage: async ({ id }) => {
        await messageRepository.delete({ where: { id } });

        await cacheService.invalidate({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });

        return { id };
    },

    getMessages: async ({ cursor, limit }) => {
        log.info("Current environment: %s", config.NODE_ENV);

        const messages = await messageRepository.findMany({
            take: limit,
            orderBy: { id: "desc" },
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            select: messageListSelect,
        });

        const nextCursor =
            messages.length === limit ? messages[messages.length - 1].id : null;

        return {
            message: RESPONSE_MESSAGES.message.fetched,
            data: { messages, nextCursor },
        };
    },
});

addDIResolverName(createService, "messageService");
