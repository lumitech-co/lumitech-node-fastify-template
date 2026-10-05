import { FastifyBaseLogger } from "fastify";
import { EnvConfig } from "@/types/env.type.js";
import { describe, expect, it, vi } from "vitest";
import { CacheService } from "@/lib/cache/cache.service.js";
import { createService } from "@/modules/message/message.service.js";
import { MESSAGE_CACHE_NAMESPACE } from "@/modules/message/message.constant.js";
import {
    messageIdSelect,
    messageListSelect,
    MessageRepository,
} from "@/database/repositories/message/message.repository.js";

const createFakeRepository = (): MessageRepository =>
    ({
        upsert: vi.fn(async () => ({ id: messageId })),
        updateUnlessNewer: vi.fn(async () => ({ count: 1 })),
        deleteMany: vi.fn(async () => ({ count: 1 })),
        findUniqueOrFail: vi.fn(async () => ({ id: messageId })),
        findMany: vi.fn(async () => []),
    }) as unknown as MessageRepository;

const createFakeCache = (): CacheService =>
    ({
        invalidate: vi.fn(async () => 0),
    }) as unknown as CacheService;

const log = { info: vi.fn() } as unknown as FastifyBaseLogger;
const enqueuedAt = new Date("2026-01-01T00:00:00.000Z");
const messageId = "0190a1b2-c3d4-7e5f-8a6b-7c8d9e0f1a2b";
const missingId = "0190a1b2-c3d4-7e5f-9a6b-000000000000";
const config = { NODE_ENV: "test" } as EnvConfig;

describe("message.service - createMessage", () => {
    it("should upsert the message by its enqueue-time id, invalidate the cache and return the id", async () => {
        const repository = createFakeRepository();
        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        const result = await service.createMessage({
            id: messageId,
            text: "Hello",
            enqueuedAt,
        });

        expect(repository.upsert).toHaveBeenCalledWith({
            where: { id: messageId },
            create: {
                id: messageId,
                text: "Hello",
                meta: undefined,
                updatedAt: enqueuedAt,
            },
            update: {},
            select: messageIdSelect,
        });
        expect(cache.invalidate).toHaveBeenCalledWith({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });
        expect(result).toEqual({ id: messageId });
    });
});

describe("message.service - updateMessage", () => {
    it("should update only when no newer write is stored, invalidate the cache and return its id", async () => {
        const repository = createFakeRepository();
        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        const result = await service.updateMessage({
            id: messageId,
            text: "Updated",
            enqueuedAt,
        });

        expect(repository.updateUnlessNewer).toHaveBeenCalledWith({
            id: messageId,
            text: "Updated",
            meta: undefined,
            updatedAt: enqueuedAt,
        });
        expect(repository.findUniqueOrFail).not.toHaveBeenCalled();
        expect(cache.invalidate).toHaveBeenCalledWith({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });
        expect(result).toEqual({ id: messageId });
    });

    it("should skip a stale write without invalidating the cache", async () => {
        const repository = createFakeRepository();
        (
            repository.updateUnlessNewer as ReturnType<typeof vi.fn>
        ).mockResolvedValueOnce({ count: 0 });
        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        const result = await service.updateMessage({
            id: messageId,
            text: "Stale",
            enqueuedAt,
        });

        expect(repository.findUniqueOrFail).toHaveBeenCalledWith({
            where: { id: messageId },
            select: messageIdSelect,
        });
        expect(cache.invalidate).not.toHaveBeenCalled();
        expect(result).toEqual({ id: messageId });
    });

    it("should propagate not-found when the message is gone", async () => {
        const repository = createFakeRepository();
        (
            repository.updateUnlessNewer as ReturnType<typeof vi.fn>
        ).mockResolvedValueOnce({ count: 0 });
        (
            repository.findUniqueOrFail as ReturnType<typeof vi.fn>
        ).mockRejectedValueOnce(new Error("Message not found."));
        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        await expect(
            service.updateMessage({
                id: missingId,
                text: "Updated",
                enqueuedAt,
            })
        ).rejects.toThrow("Message not found.");

        expect(cache.invalidate).not.toHaveBeenCalled();
    });
});

describe("message.service - deleteMessage", () => {
    it("should delete the message, invalidate the cache and return the id", async () => {
        const repository = createFakeRepository();
        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        const result = await service.deleteMessage({ id: messageId });

        expect(repository.deleteMany).toHaveBeenCalledWith({
            where: { id: messageId },
        });
        expect(cache.invalidate).toHaveBeenCalledWith({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });
        expect(result).toEqual({ id: messageId });
    });
});

describe("message.service - getMessages", () => {
    it("should request the list select and return null nextCursor under the limit", async () => {
        const repository = createFakeRepository();
        (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            [
                {
                    id: messageId,
                    createdAt: new Date(),
                    text: "Hello",
                    meta: null,
                },
            ]
        );
        const service = createService(
            repository,
            createFakeCache(),
            log,
            config
        );

        const result = await service.getMessages({ limit: 20 });

        expect(repository.findMany).toHaveBeenCalledWith({
            take: 20,
            orderBy: { id: "desc" },
            select: messageListSelect,
        });
        expect(result.data.nextCursor).toBeNull();
    });

    it("should set nextCursor to the last row's id when the page is full", async () => {
        const repository = createFakeRepository();
        (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            [
                { id: missingId, createdAt: new Date(), text: "A", meta: null },
                { id: messageId, createdAt: new Date(), text: "B", meta: null },
            ]
        );
        const service = createService(
            repository,
            createFakeCache(),
            log,
            config
        );

        const result = await service.getMessages({ limit: 2 });

        expect(result.data.nextCursor).toBe(messageId);
    });

    it("should pass the cursor through to the repository", async () => {
        const repository = createFakeRepository();
        const service = createService(
            repository,
            createFakeCache(),
            log,
            config
        );

        await service.getMessages({ limit: 10, cursor: messageId });

        expect(repository.findMany).toHaveBeenCalledWith({
            take: 10,
            orderBy: { id: "desc" },
            skip: 1,
            cursor: { id: messageId },
            select: messageListSelect,
        });
    });
});
