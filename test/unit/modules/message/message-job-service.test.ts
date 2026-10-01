import { Queue, UnrecoverableError } from "bullmq";
import { describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError } from "@/lib/errors/errors.js";
import { MessageService } from "@/modules/message/message.service.js";
import { createService } from "@/modules/message/mq/message.service.js";
import { MessageJobName } from "@/modules/message/mq/message.constant.js";
import { MessageJobData } from "@/modules/message/mq/message.type.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import {
    messageIdSelect,
    MessageRepository,
} from "@/database/repositories/message/message.repository.js";

type FakeMessageQueue = Queue<MessageJobData, unknown, MessageJobName>;

const enqueuedAt = new Date("2026-01-01T00:00:00.000Z");
const messageId = "0190a1b2-c3d4-7e5f-8a6b-7c8d9e0f1a2b";
const missingId = "0190a1b2-c3d4-7e5f-9a6b-000000000000";

const createFakeMessageService = (): MessageService => ({
    createMessage: vi.fn(async () => ({ id: messageId })),
    updateMessage: vi.fn(async () => ({ id: messageId })),
    deleteMessage: vi.fn(async () => ({ id: messageId })),
    getMessages: vi.fn(),
});

const createFakeRepository = (): MessageRepository =>
    ({
        findUnique: vi.fn(async () => null),
        findUniqueOrFail: vi.fn(async () => ({ id: messageId })),
        generateId: vi.fn(async () => messageId),
    }) as unknown as MessageRepository;

const createFakeQueue = () =>
    ({
        add: vi.fn(async (name: MessageJobName) => ({ id: `${name}-job-id` })),
    }) as unknown as FakeMessageQueue;

const buildService = ({
    messageService = createFakeMessageService(),
    repository = createFakeRepository(),
    queue = createFakeQueue(),
}: {
    messageService?: MessageService;
    repository?: MessageRepository;
    queue?: FakeMessageQueue;
} = {}) => createService(messageService, repository, queue);

describe("mq/message.service - processMessageJob", () => {
    it("should call createMessage with the enqueue time for a create job", async () => {
        const messageService = createFakeMessageService();
        const service = buildService({ messageService });

        const result = await service.processMessageJob({
            name: MessageJobName.Create,
            data: { id: messageId, text: "Hello" },
            enqueuedAt,
        });

        expect(messageService.createMessage).toHaveBeenCalledWith({
            id: messageId,
            text: "Hello",
            enqueuedAt,
        });
        expect(result).toEqual({ id: messageId });
    });

    it("should call updateMessage with the enqueue time for an update job", async () => {
        const messageService = createFakeMessageService();
        const service = buildService({ messageService });

        await service.processMessageJob({
            name: MessageJobName.Update,
            data: { id: messageId, text: "Updated" },
            enqueuedAt,
        });

        expect(messageService.updateMessage).toHaveBeenCalledWith({
            id: messageId,
            text: "Updated",
            enqueuedAt,
        });
    });

    it("should call deleteMessage for a delete job", async () => {
        const messageService = createFakeMessageService();
        const service = buildService({ messageService });

        await service.processMessageJob({
            name: MessageJobName.Delete,
            data: { id: messageId },
            enqueuedAt,
        });

        expect(messageService.deleteMessage).toHaveBeenCalledWith({
            id: messageId,
        });
    });

    it("should fail an unknown job name without retries", async () => {
        const service = buildService();

        await expect(
            service.processMessageJob({
                name: "unknown" as MessageJobName,
                data: { id: messageId },
                enqueuedAt,
            })
        ).rejects.toThrow(UnrecoverableError);
    });

    it("should fail invalid job data without retries", async () => {
        const messageService = createFakeMessageService();
        const service = buildService({ messageService });

        await expect(
            service.processMessageJob({
                name: MessageJobName.Create,
                data: { id: messageId },
                enqueuedAt,
            })
        ).rejects.toThrow(UnrecoverableError);

        expect(messageService.createMessage).not.toHaveBeenCalled();
    });

    it("should fail a missing message without retries", async () => {
        const messageService = createFakeMessageService();
        (
            messageService.updateMessage as ReturnType<typeof vi.fn>
        ).mockRejectedValueOnce(
            new NotFoundError(RESPONSE_MESSAGES.message.notFound)
        );
        const service = buildService({ messageService });

        await expect(
            service.processMessageJob({
                name: MessageJobName.Update,
                data: { id: missingId, text: "Updated" },
                enqueuedAt,
            })
        ).rejects.toThrow(UnrecoverableError);
    });

    it("should rethrow other errors as-is so the job is retried", async () => {
        const messageService = createFakeMessageService();
        const transient = new Error("Connection lost");
        (
            messageService.deleteMessage as ReturnType<typeof vi.fn>
        ).mockRejectedValueOnce(transient);
        const service = buildService({ messageService });

        await expect(
            service.processMessageJob({
                name: MessageJobName.Delete,
                data: { id: messageId },
                enqueuedAt,
            })
        ).rejects.toBe(transient);
    });
});

describe("mq/message.service - enqueue*", () => {
    it("should enqueue a create job with an id generated by Postgres and return it", async () => {
        const queue = createFakeQueue();
        const repository = createFakeRepository();
        const service = buildService({ queue, repository });

        const result = await service.enqueueCreateMessage({
            payload: { text: "Hello" },
        });

        expect(repository.generateId).toHaveBeenCalledOnce();
        expect(repository.findUnique).not.toHaveBeenCalled();
        expect(queue.add).toHaveBeenCalledWith(MessageJobName.Create, {
            text: "Hello",
            id: messageId,
        });
        expect(result).toEqual({
            message: RESPONSE_MESSAGES.message.createQueued,
            data: { id: messageId, jobId: `${MessageJobName.Create}-job-id` },
        });
    });

    it("should keep a client-provided id without asking Postgres for one", async () => {
        const queue = createFakeQueue();
        const repository = createFakeRepository();
        const service = buildService({ queue, repository });

        const result = await service.enqueueCreateMessage({
            payload: { id: missingId, text: "Hello" },
        });

        expect(repository.generateId).not.toHaveBeenCalled();
        expect(queue.add).toHaveBeenCalledWith(MessageJobName.Create, {
            id: missingId,
            text: "Hello",
        });
        expect(result.data.id).toBe(missingId);
    });

    it("should reject a client-provided id that is already stored", async () => {
        const queue = createFakeQueue();
        const repository = createFakeRepository();
        (repository.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: messageId,
        });
        const service = buildService({ queue, repository });

        await expect(
            service.enqueueCreateMessage({
                payload: { id: messageId, text: "Hello" },
            })
        ).rejects.toThrow(ConflictError);
        expect(queue.add).not.toHaveBeenCalled();
    });

    it("should enqueue an update job after checking the message exists", async () => {
        const queue = createFakeQueue();
        const repository = createFakeRepository();
        const service = buildService({ queue, repository });

        const result = await service.enqueueUpdateMessage({
            id: messageId,
            payload: { meta: null },
        });

        expect(repository.findUniqueOrFail).toHaveBeenCalledWith({
            where: { id: messageId },
            select: messageIdSelect,
        });
        expect(queue.add).toHaveBeenCalledWith(MessageJobName.Update, {
            id: messageId,
            meta: null,
        });
        expect(result.message).toBe(RESPONSE_MESSAGES.message.updateQueued);
    });

    it("should enqueue a delete job after checking the message exists", async () => {
        const queue = createFakeQueue();
        const repository = createFakeRepository();
        const service = buildService({ queue, repository });

        const result = await service.enqueueDeleteMessage({ id: messageId });

        expect(repository.findUniqueOrFail).toHaveBeenCalledWith({
            where: { id: messageId },
            select: messageIdSelect,
        });
        expect(queue.add).toHaveBeenCalledWith(MessageJobName.Delete, {
            id: messageId,
        });
        expect(result.message).toBe(RESPONSE_MESSAGES.message.deleteQueued);
    });

    it("should not enqueue an update or delete for a missing message", async () => {
        const queue = createFakeQueue();
        const repository = createFakeRepository();
        (
            repository.findUniqueOrFail as ReturnType<typeof vi.fn>
        ).mockRejectedValue(
            new NotFoundError(RESPONSE_MESSAGES.message.notFound)
        );
        const service = buildService({ queue, repository });

        await expect(
            service.enqueueUpdateMessage({
                id: missingId,
                payload: { text: "x" },
            })
        ).rejects.toThrow(NotFoundError);
        await expect(
            service.enqueueDeleteMessage({ id: missingId })
        ).rejects.toThrow(NotFoundError);

        expect(queue.add).not.toHaveBeenCalled();
    });
});
