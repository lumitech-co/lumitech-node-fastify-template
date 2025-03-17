import { FastifyInstance } from "fastify";
import { MessageHandler } from "./message.handler";
import {
    createMessageBodySchema,
    createMessageResponseSchema,
    fetchMessagesResponseSchema,
} from "@/lib/validation/message";

export const createMessageRoutes = (
    fastify: FastifyInstance,
    messageHandler: MessageHandler
) => {
    fastify.post(
        "/",
        {
            schema: {
                tags: ["message"],
                summary: "Create message",
                body: createMessageBodySchema,
                response: {
                    200: createMessageResponseSchema,
                },
            },
        },
        messageHandler.createMessage
    );

    fastify.get(
        "/",
        {
            schema: {
                tags: ["message"],
                summary: "Fetch messages",
                response: {
                    200: fetchMessagesResponseSchema,
                },
            },
        },
        messageHandler.getMessages
    );
};
