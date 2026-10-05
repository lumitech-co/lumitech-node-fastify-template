import type { FastifyBaseLogger } from "fastify";
import type { EnvConfig } from "@/types/env.type.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import type { MessageJobResult } from "./mq/message.type.js";
import { MESSAGE_CACHE_NAMESPACE } from "./message.constant.js";
import type { CacheService } from "@/lib/cache/cache.service.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import type {
    CreateMessagePayload,
    UpdateMessagePayload,
} from "./message.type.js";
import type { MessageRepository } from "@/database/repositories/message/message.repository.js";
import {
    messageIdSelect,
    messageListSelect,
} from "@/database/repositories/message/message.repository.js";
import type {
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
        await messageRepository.upsert({
            where: { id },
            create: { id, text, meta, updatedAt: enqueuedAt },
            update: {},
            select: messageIdSelect,
        });

        await cacheService.invalidate({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });

        return { id };
    },

    updateMessage: async ({ id, text, meta, enqueuedAt }) => {
        const { count } = await messageRepository.updateUnlessNewer({
            id,
            text,
            meta,
            updatedAt: enqueuedAt,
        });

        if (count === 0) {
            await messageRepository.findUniqueOrFail({
                where: { id },
                select: messageIdSelect,
            });

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
