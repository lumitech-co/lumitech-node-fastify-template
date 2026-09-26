import { MessageService } from "./message.service.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { MessageJobService } from "./mq/message.service.js";
import {
    CreateMessageInput,
    UpdateMessageInput,
    MessageIdParam,
    FetchMessagesQuery,
} from "@/lib/validation/message/message.schema.js";

export type MessageHandler = {
    createMessage: (
        request: FastifyRequest<{
            Body: CreateMessageInput;
        }>,
        reply: FastifyReply
    ) => Promise<void>;

    updateMessage: (
        request: FastifyRequest<{
            Params: MessageIdParam;
            Body: UpdateMessageInput;
        }>,
        reply: FastifyReply
    ) => Promise<void>;

    deleteMessage: (
        request: FastifyRequest<{
            Params: MessageIdParam;
        }>,
        reply: FastifyReply
    ) => Promise<void>;

    getMessages: (
        request: FastifyRequest<{
            Querystring: FetchMessagesQuery;
        }>,
        reply: FastifyReply
    ) => Promise<void>;
};

export const createHandler = (
    messageJobService: MessageJobService,
    messageService: MessageService
): MessageHandler => {
    return {
        createMessage: async (request, reply) => {
            const data = await messageJobService.enqueueCreateMessage({
                payload: request.body,
            });

            return reply.status(200).send(data);
        },

        updateMessage: async (request, reply) => {
            const data = await messageJobService.enqueueUpdateMessage({
                id: request.params.id,
                payload: request.body,
            });

            return reply.status(200).send(data);
        },

        deleteMessage: async (request, reply) => {
            const data = await messageJobService.enqueueDeleteMessage({
                id: request.params.id,
            });

            return reply.status(200).send(data);
        },

        getMessages: async (request, reply) => {
            const data = await messageService.getMessages(request.query);

            return reply.send(data);
        },
    };
};

addDIResolverName(createHandler, "messageHandler");
