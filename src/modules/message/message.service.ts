import { FastifyBaseLogger } from "fastify";
import { EnvConfig } from "@/types/env.type.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import { MessageRepository } from "@/database/repositories/message/message.repository.js";
import {
    CreateMessageInput,
    CreateMessageResponse,
    FetchMessagesResponse,
} from "@/lib/validation/message/message.schema.js";

export type CreateMessagePayload = {
    payload: CreateMessageInput;
};

export type MessageService = {
    createMessage: (
        payload: CreateMessagePayload
    ) => Promise<CreateMessageResponse>;
    getMessages: () => Promise<FetchMessagesResponse>;
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
            select: {
                id: true,
                createdAt: true,
                text: true,
                meta: true,
            },
        });

        return {
            message: RESPONSE_MESSAGES.message.created,
            data: {
                message,
            },
        };
    },

    getMessages: async () => {
        log.info("Current environment: %s", config.NODE_ENV);
        const messages = await messageRepository.findMany();

        return {
            message: RESPONSE_MESSAGES.message.fetched,
            data: { messages },
        };
    },
});

addDIResolverName(createService, "messageService");
