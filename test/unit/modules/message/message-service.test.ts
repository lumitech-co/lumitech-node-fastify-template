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
        create: vi.fn(async () => ({ id: 1 })),
        update: vi.fn(async () => ({ id: 1 })),
        delete: vi.fn(async () => ({ id: 1 })),
        findMany: vi.fn(async () => []),
    }) as unknown as MessageRepository;

const createFakeCache = (): CacheService =>
    ({
        invalidate: vi.fn(async () => 0),
    }) as unknown as CacheService;

const log = { info: vi.fn() } as unknown as FastifyBaseLogger;
const config = { NODE_ENV: "test" } as EnvConfig;

describe("message.service - createMessage", () => {
    it("should create the message, invalidate the cache and return its id", async () => {
        const repository = createFakeRepository();
        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        const result = await service.createMessage({ text: "Hello" });

        expect(repository.create).toHaveBeenCalledWith({
            data: { text: "Hello", meta: undefined },
            select: messageIdSelect,
        });
        expect(cache.invalidate).toHaveBeenCalledWith({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });
        expect(result).toEqual({ id: 1 });
    });
});

describe("message.service - updateMessage", () => {
    it("should update the message, invalidate the cache and return its id", async () => {
        const repository = createFakeRepository();
        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        const result = await service.updateMessage({ id: 1, text: "Updated" });

        expect(repository.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { text: "Updated", meta: undefined },
            select: messageIdSelect,
        });
        expect(cache.invalidate).toHaveBeenCalledWith({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });
        expect(result).toEqual({ id: 1 });
    });

    it("should propagate the repository error without invalidating the cache", async () => {
        const repository = createFakeRepository();
        (repository.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            new Error("Record not found")
        );
        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        await expect(
            service.updateMessage({ id: 999, text: "Updated" })
        ).rejects.toThrow("Record not found");

        expect(cache.invalidate).not.toHaveBeenCalled();
    });
});

describe("message.service - deleteMessage", () => {
    it("should delete the message, invalidate the cache and return the id", async () => {
        const repository = createFakeRepository();
        const cache = createFakeCache();
        const service = createService(repository, cache, log, config);

        const result = await service.deleteMessage({ id: 1 });

        expect(repository.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        expect(cache.invalidate).toHaveBeenCalledWith({
            namespace: MESSAGE_CACHE_NAMESPACE,
        });
        expect(result).toEqual({ id: 1 });
    });
});

describe("message.service - getMessages", () => {
    it("should request the list select and return null nextCursor under the limit", async () => {
        const repository = createFakeRepository();
        (repository.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            [{ id: 1, createdAt: new Date(), text: "Hello", meta: null }]
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
                { id: 2, createdAt: new Date(), text: "A", meta: null },
                { id: 1, createdAt: new Date(), text: "B", meta: null },
            ]
        );
        const service = createService(
            repository,
            createFakeCache(),
            log,
            config
        );

        const result = await service.getMessages({ limit: 2 });

        expect(result.data.nextCursor).toBe(1);
    });

    it("should pass the cursor through to the repository", async () => {
        const repository = createFakeRepository();
        const service = createService(
            repository,
            createFakeCache(),
            log,
            config
        );

        await service.getMessages({ limit: 10, cursor: 5 });

        expect(repository.findMany).toHaveBeenCalledWith({
            take: 10,
            orderBy: { id: "desc" },
            skip: 1,
            cursor: { id: 5 },
            select: messageListSelect,
        });
    });
});
