import type { FastifyBaseLogger } from "fastify";
import { dayjs } from "@/lib/dayjs/dayjs.util.js";
import { describe, expect, it, vi } from "vitest";
import type { EnvConfig } from "@/types/env.type.js";
import type { CacheService } from "@/lib/cache/cache.service.js";
import { createService } from "@/modules/message/message.service.js";
import { MESSAGE_CACHE_NAMESPACE } from "@/modules/message/message.constant.js";
import type { MessageRepository } from "@/modules/message/message.repository.js";

const createFakeRepository = (): MessageRepository =>
    ({
        createIfAbsent: vi.fn(async () => undefined),
        updateIfNotNewer: vi.fn(async () => true),
        deleteById: vi.fn(async () => undefined),
        findPage: vi.fn(async () => ({ messages: [], nextCursor: null })),
    }) as unknown as MessageRepository;

const createFakeCache = (): CacheService =>
    ({
        invalidate: vi.fn(async () => 0),
    }) as unknown as CacheService;

const log = { info: vi.fn() } as unknown as FastifyBaseLogger;
const enqueuedAt = dayjs("2026-01-01T00:00:00.000Z").toDate();
const messageId = "0190a1b2-c3d4-7e5f-8a6b-7c8d9e0f1a2b";
const missingId = "0190a1b2-c3d4-7e5f-9a6b-000000000000";
const config = { NODE_ENV: "test" } as EnvConfig;

describe("message.service - createMessage", () => {
    it("should create the message by its enqueue-time id if absent, invalidate the cache and return the id", async () => {
        const repository = createFakeRepository();
        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        const result = await service.createMessage({
            id: messageId,
            text: "Hello",
            enqueuedAt,
        });

        expect(repository.createIfAbsent).toHaveBeenCalledWith({
            id: messageId,
            text: "Hello",
            meta: undefined,
            updatedAt: enqueuedAt,
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

        expect(repository.updateIfNotNewer).toHaveBeenCalledWith({
            id: messageId,
            text: "Updated",
            meta: undefined,
            updatedAt: enqueuedAt,
        });

        expect(cache.invalidate).toHaveBeenCalledWith({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });

        expect(result).toEqual({ id: messageId });
    });

    it("should skip a stale write without invalidating the cache", async () => {
        const repository = createFakeRepository();

        (
            repository.updateIfNotNewer as ReturnType<typeof vi.fn>
        ).mockResolvedValueOnce(false);

        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        const result = await service.updateMessage({
            id: messageId,
            text: "Stale",
            enqueuedAt,
        });

        expect(cache.invalidate).not.toHaveBeenCalled();
        expect(result).toEqual({ id: messageId });
    });

    it("should propagate not-found when the message is gone", async () => {
        const repository = createFakeRepository();

        (
            repository.updateIfNotNewer as ReturnType<typeof vi.fn>
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

        expect(repository.deleteById).toHaveBeenCalledWith({
            id: messageId,
        });

        expect(cache.invalidate).toHaveBeenCalledWith({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });

        expect(result).toEqual({ id: messageId });
    });
});

describe("message.service - getMessages", () => {
    it("should return the repository page as data", async () => {
        const repository = createFakeRepository();

        const page = {
            messages: [
                {
                    id: messageId,
                    createdAt: dayjs().toDate(),
                    text: "A",
                    meta: null,
                },
            ],
            nextCursor: messageId,
        };

        (repository.findPage as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            page
        );

        const service = createService(
            repository,
            createFakeCache(),
            log,
            config
        );

        const result = await service.getMessages({ limit: 20 });

        expect(repository.findPage).toHaveBeenCalledWith({
            cursor: undefined,
            limit: 20,
        });

        expect(result.data).toBe(page);
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

        expect(repository.findPage).toHaveBeenCalledWith({
            cursor: messageId,
            limit: 10,
        });
    });
});
