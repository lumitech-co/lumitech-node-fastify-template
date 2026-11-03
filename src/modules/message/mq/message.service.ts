import { match } from "ts-pattern";
import type { Queue } from "bullmq";
import { MessageJobName } from "./message.constant.js";
import { BadRequestError } from "@/lib/errors/errors.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import type { MessageService } from "@/modules/message/message.service.js";
import type { MessageRepository } from "@/modules/message/message.repository.js";
import type { EnqueueMessageResponse } from "@/modules/message/message.schema.js";
import {
    createMessageJobSchema,
    updateMessageJobSchema,
    deleteMessageJobSchema,
} from "@/modules/message/message.schema.js";
import type {
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
): MessageJobService => ({
    processMessageJob: async ({ name, data, enqueuedAt }) =>
        match(name)
            .with(MessageJobName.Create, () =>
                messageService.createMessage({
                    ...createMessageJobSchema.parse(data),
                    enqueuedAt,
                })
            )
            .with(MessageJobName.Update, () =>
                messageService.updateMessage({
                    ...updateMessageJobSchema.parse(data),
                    enqueuedAt,
                })
            )
            .with(MessageJobName.Delete, () =>
                messageService.deleteMessage(deleteMessageJobSchema.parse(data))
            )
            .otherwise(() => {
                throw new BadRequestError(
                    `${RESPONSE_MESSAGES.message.unknownJobName}: ${String(name)}`
                );
            }),

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
        await messageRepository.assertExists({ id });

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
        await messageRepository.assertExists({ id });

        const job = await messageQueue.add(MessageJobName.Delete, { id });

        return {
            message: RESPONSE_MESSAGES.message.deleteQueued,
            data: { id, jobId: job.id ?? "" },
        };
    },
});

addDIResolverName(createService, "messageJobService");
