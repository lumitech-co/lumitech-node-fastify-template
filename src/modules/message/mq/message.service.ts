import { Queue } from "bullmq";
import { MessageService } from "../message.service.js";
import { MessageJobName } from "./message.constant.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
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
    messageQueue: Queue<MessageJobData, unknown, MessageJobName>
): MessageJobService => ({
    processMessageJob: async ({ name, data }) => {
        switch (name) {
        case MessageJobName.Create:
            return messageService.createMessage(
                createMessageJobSchema.parse(data)
            );
        case MessageJobName.Update:
            return messageService.updateMessage(
                updateMessageJobSchema.parse(data)
            );
        case MessageJobName.Delete:
            return messageService.deleteMessage(
                deleteMessageJobSchema.parse(data)
            );
        default:
            throw new Error(`Unknown message job name: ${name}`);
        }
    },

    enqueueCreateMessage: async ({ payload }) => {
        const job = await messageQueue.add(MessageJobName.Create, payload);

        return {
            message: RESPONSE_MESSAGES.message.createQueued,
            data: { jobId: job.id ?? "" },
        };
    },

    enqueueUpdateMessage: async ({ id, payload }) => {
        const job = await messageQueue.add(MessageJobName.Update, {
            id,
            ...payload,
        });

        return {
            message: RESPONSE_MESSAGES.message.updateQueued,
            data: { jobId: job.id ?? "" },
        };
    },

    enqueueDeleteMessage: async ({ id }) => {
        const job = await messageQueue.add(MessageJobName.Delete, { id });

        return {
            message: RESPONSE_MESSAGES.message.deleteQueued,
            data: { jobId: job.id ?? "" },
        };
    },
});

addDIResolverName(createService, "messageJobService");
