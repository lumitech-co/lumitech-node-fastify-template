import { FastifyBaseLogger } from "fastify";
import { EnvConfig } from "@/types/env.type.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import { MessageRepository } from "@/database/repositories/message/message.repository.js";
import {
    CreateMessageInput,
    FetchMessagesQuery,
    CreateMessageResponse,
    FetchMessagesResponse,
} from "@/lib/validation/message/message.schema.js";

export type CreateMessagePayload = {
    payload: CreateMessageInput;
};

export type GetMessagesPayload = {
    query: FetchMessagesQuery;
};

export type MessageService = {
    createMessage: (
        payload: CreateMessagePayload
    ) => Promise<CreateMessageResponse>;
    getMessages: (
        payload: GetMessagesPayload
    ) => Promise<FetchMessagesResponse>;
};

export const createService = (
    messageRepository: MessageRepository,
    log: FastifyBaseLogger,
    config: EnvConfig
): MessageService => ({
    createMessage: async ({ payload }) => {
        const { text, meta } = payload;

        const message = await messageRepository.create({
            data: { text, meta },
        });

        return {
            message: RESPONSE_MESSAGES.message.created,
            data: {
                message,
            },
        };
    },

    getMessages: async ({ query }) => {
        log.info("Current environment: %s", config.NODE_ENV);
        const { cursor, limit } = query;

        const { items, nextCursor } = await messageRepository.findPage({
            cursor,
            limit,
        });

        return {
            message: RESPONSE_MESSAGES.message.fetched,
            data: { messages: items, nextCursor },
        };
    },
});

addDIResolverName(createService, "messageService");
