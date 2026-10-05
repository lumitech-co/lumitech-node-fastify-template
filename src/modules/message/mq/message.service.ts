import type { Queue } from "bullmq";
import { MessageJobName } from "./message.constant.js";
import { BadRequestError } from "@/lib/errors/errors.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { MessageService } from "@/modules/message/message.service.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import {
    messageIdSelect,
    MessageRepository,
} from "@/database/repositories/message/message.repository.js";
import {
    createMessageJobSchema,
    updateMessageJobSchema,
    deleteMessageJobSchema,
    EnqueueMessageResponse,
} from "@/lib/validation/message/message.schema.js";
import {
    ProcessMessageJobPayload,
    MessageJobResult,
    EnqueueCreateMessagePayload,
    EnqueueUpdateMessagePayload,
    EnqueueDeleteMessagePayload,
    MessageJobData,
} from "./message.type.js";

export type MessageJobService = {
    processMessageJob: (
        payload: ProcessMessageJobPayload
    ) => Promise<MessageJobResult>;
    enqueueCreateMessage: (
        payload: EnqueueCreateMessagePayload
    ) => Promise<EnqueueMessageResponse>;
    enqueueUpdateMessage: (
        payload: EnqueueUpdateMessagePayload
    ) => Promise<EnqueueMessageResponse>;
    enqueueDeleteMessage: (
        payload: EnqueueDeleteMessagePayload
    ) => Promise<EnqueueMessageResponse>;
};

export const createService = (
    messageService: MessageService,
    messageRepository: MessageRepository,
    messageQueue: Queue<MessageJobData, unknown, MessageJobName>
): MessageJobService => {
    return {
        processMessageJob: async ({ name, data, enqueuedAt }) => {
            switch (name) {
            case MessageJobName.Create:
                return messageService.createMessage({
                    ...createMessageJobSchema.parse(data),
                    enqueuedAt,
                });
            case MessageJobName.Update:
                return messageService.updateMessage({
                    ...updateMessageJobSchema.parse(data),
                    enqueuedAt,
                });
            case MessageJobName.Delete:
                return messageService.deleteMessage(
                    deleteMessageJobSchema.parse(data)
                );
            default:
                throw new BadRequestError(
                    `${RESPONSE_MESSAGES.message.unknownJobName}: ${name}`
                );
            }
        },

        enqueueCreateMessage: async ({ payload }) => {
            const id = payload.id ?? (await messageRepository.generateId());

            const job = await messageQueue.add(MessageJobName.Create, {
                ...payload,
                id,
            });

            return {
                message: RESPONSE_MESSAGES.message.createQueued,
                data: { id, jobId: job.id ?? "" },
            };
        },

        enqueueUpdateMessage: async ({ id, payload }) => {
            await messageRepository.findUniqueOrFail({
                where: { id },
                select: messageIdSelect,
            });

            const job = await messageQueue.add(MessageJobName.Update, {
                id,
                ...payload,
            });

            return {
                message: RESPONSE_MESSAGES.message.updateQueued,
                data: { id, jobId: job.id ?? "" },
            };
        },

        enqueueDeleteMessage: async ({ id }) => {
            await messageRepository.findUniqueOrFail({
                where: { id },
                select: messageIdSelect,
            });

            const job = await messageQueue.add(MessageJobName.Delete, { id });

            return {
                message: RESPONSE_MESSAGES.message.deleteQueued,
                data: { id, jobId: job.id ?? "" },
            };
        },
    };
};

addDIResolverName(createService, "messageJobService");
