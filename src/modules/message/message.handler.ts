import { MessageService } from "./message.service.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { CreateMessageInput } from "@/lib/validation/message/message.schema.js";

export type MessageHandler = {
    createMessage: (
        request: FastifyRequest<{
            Body: CreateMessageInput;
        }>,
        reply: FastifyReply
    ) => Promise<void>;

    getMessages: (
        request: FastifyRequest,
        reply: FastifyReply
    ) => Promise<void>;
};

export const createHandler = (
    messageService: MessageService
): MessageHandler => {
    return {
        createMessage: async (request, reply) => {
            const { body } = request;

            const data = await messageService.createMessage({
                payload: body,
            });

            return reply.send(data);
        },

        getMessages: async (_request, reply) => {
            const data = await messageService.getMessages();

            return reply.send(data);
        },
    };
};

addDIResolverName(createHandler, "messageHandler");
