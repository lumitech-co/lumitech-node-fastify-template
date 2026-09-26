import { Queue } from "bullmq";
import { describe, expect, it, vi } from "vitest";
import { MessageService } from "@/modules/message/message.service.js";
import { createService } from "@/modules/message/mq/message.service.js";
import { MessageJobName } from "@/modules/message/mq/message.constant.js";
import { MessageJobData } from "@/modules/message/mq/message.type.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";

type FakeMessageQueue = Queue<MessageJobData, unknown, MessageJobName>;

const createFakeMessageService = (): MessageService => ({
    createMessage: vi.fn(async () => ({ id: 1 })),
    updateMessage: vi.fn(async () => ({ id: 1 })),
    deleteMessage: vi.fn(async () => ({ id: 1 })),
    getMessages: vi.fn(),
});

const createFakeQueue = () =>
    ({
        add: vi.fn(async (name: MessageJobName) => ({ id: `${name}-job-id` })),
    }) as unknown as FakeMessageQueue;

describe("mq/message.service - processMessageJob", () => {
    it("should call createMessage for a create job", async () => {
        const messageService = createFakeMessageService();
        const service = createService(messageService, createFakeQueue());

        const result = await service.processMessageJob({
            name: MessageJobName.Create,
            data: { text: "Hello" },
        });

        expect(messageService.createMessage).toHaveBeenCalledWith({
            text: "Hello",
        });
        expect(result).toEqual({ id: 1 });
    });

    it("should call updateMessage for an update job", async () => {
        const messageService = createFakeMessageService();
        const service = createService(messageService, createFakeQueue());

        await service.processMessageJob({
            name: MessageJobName.Update,
            data: { id: 1, text: "Updated" },
        });

        expect(messageService.updateMessage).toHaveBeenCalledWith({
            id: 1,
            text: "Updated",
        });
    });

    it("should call deleteMessage for a delete job", async () => {
        const messageService = createFakeMessageService();
        const service = createService(messageService, createFakeQueue());

        await service.processMessageJob({
            name: MessageJobName.Delete,
            data: { id: 1 },
        });

        expect(messageService.deleteMessage).toHaveBeenCalledWith({ id: 1 });
    });

    it("should throw for an unknown job name", async () => {
        const service = createService(
            createFakeMessageService(),
            createFakeQueue()
        );

        await expect(
            service.processMessageJob({
                // Cast to simulate a job name outside the known enum.
                name: "unknown" as MessageJobName,
                data: { text: "Hello" },
            })
        ).rejects.toThrow(/Unknown message job name/);
    });
});

describe("mq/message.service - enqueue*", () => {
    it("should enqueue a create job and return its id", async () => {
        const queue = createFakeQueue();
        const service = createService(createFakeMessageService(), queue);

        const result = await service.enqueueCreateMessage({
            payload: { text: "Hello" },
        });

        expect(queue.add).toHaveBeenCalledWith(MessageJobName.Create, {
            text: "Hello",
        });
        expect(result).toEqual({
            message: RESPONSE_MESSAGES.message.createQueued,
            data: { jobId: `${MessageJobName.Create}-job-id` },
        });
    });

    it("should enqueue an update job with the id merged into the payload", async () => {
        const queue = createFakeQueue();
        const service = createService(createFakeMessageService(), queue);

        const result = await service.enqueueUpdateMessage({
            id: 5,
            payload: { text: "Updated" },
        });

        expect(queue.add).toHaveBeenCalledWith(MessageJobName.Update, {
            id: 5,
            text: "Updated",
        });
        expect(result.message).toBe(RESPONSE_MESSAGES.message.updateQueued);
    });

    it("should enqueue a delete job with only the id", async () => {
        const queue = createFakeQueue();
        const service = createService(createFakeMessageService(), queue);

        const result = await service.enqueueDeleteMessage({ id: 5 });

        expect(queue.add).toHaveBeenCalledWith(MessageJobName.Delete, {
            id: 5,
        });
        expect(result.message).toBe(RESPONSE_MESSAGES.message.deleteQueued);
    });
});
