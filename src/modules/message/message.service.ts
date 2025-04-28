import { FastifyBaseLogger } from "fastify";
import { EnvConfig } from "@/types/env.type.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { MessageRepository } from "@/database/repositories/message/message.repository.js";
import {
    CreateMessageInput,
    CreateMessageResponse,
    FetchMessagesResponse,
} from "@/lib/validation/message/message.schema.js";

export type MessageService = {
    createMessage: (p: {
        payload: CreateMessageInput;
    }) => Promise<CreateMessageResponse>;
    getMessages: () => Promise<FetchMessagesResponse>;
};

export const createService = (
    messageRepository: MessageRepository,
    log: FastifyBaseLogger,
    config: EnvConfig
): MessageService => ({
    createMessage: async ({ payload }) => {
        const { text } = payload;

        const message = await messageRepository.create({
            data: { text },
            select: {
                id: true,
                createdAt: true,
                text: true,
            },
        });

        return {
            message: "Message created successfully.",
            data: {
                message,
            },
        };
    },

    getMessages: async () => {
        log.info("Current environment: %s", config.NODE_ENV);
        const messages = await messageRepository.findMany();

        return {
            message: "Messages fetched successfully.",
            data: { messages },
        };
    },
});

addDIResolverName(createService, "messageService");
