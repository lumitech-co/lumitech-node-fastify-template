import { FastifyInstance } from "fastify";
import { MessageHandler } from "./message.handler.js";
import {
    createMessageBodySchema,
    createMessageResponseSchema,
    fetchMessagesResponseSchema,
} from "@/lib/validation/message/message.schema.js";

const MESSAGE_TAG = "message";

enum MessageRoute {
    Root = "/",
}

export const createMessageRoutes = (
    fastify: FastifyInstance,
    messageHandler: MessageHandler
) => {
    fastify.post(
        MessageRoute.Root,
        {
            schema: {
                tags: [MESSAGE_TAG],
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
        MessageRoute.Root,
        {
            schema: {
                tags: [MESSAGE_TAG],
                summary: "Fetch messages",
                response: {
                    200: fetchMessagesResponseSchema,
                },
            },
        },
        messageHandler.getMessages
    );
};
