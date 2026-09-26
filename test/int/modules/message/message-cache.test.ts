import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createMessage } from "../../factories/message.factory.js";
import { waitForMessageJob } from "../../helpers/wait-for-message-job.js";
import {
    CACHE_STATUS_HEADER,
    CACHE_STATUS_HIT,
    CACHE_STATUS_MISS,
} from "@/lib/cache/cache.constant.js";

describe("Response cache for /api/messages", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer();

        return async () => {
            await server.close();
        };
    });

    it("should MISS on the first GET and HIT on the second", async () => {
        const first = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        const second = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(first.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(second.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_HIT);
        expect(second.json()).toMatchObject({ data: { messages: [] } });
    });

    it("should keep serving the cached response while data changes behind it", async () => {
        await server.inject({ method: "GET", url: "/api/messages" });

        await server.prisma.message.create({
            data: { text: "Written straight to the DB" },
        });

        const cached = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(cached.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_HIT);
        expect(cached.json()).toMatchObject({ data: { messages: [] } });
    });

    it("should invalidate the cache when a message is created", async () => {
        const primed = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(primed.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(primed.json()).toMatchObject({ data: { messages: [] } });

        const created = await server.inject({
            method: "POST",
            url: "/api/messages",
            body: { text: "Hello, world!" },
        });

        await waitForMessageJob({ server, jobId: created.json().data.jobId });

        const refetched = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(refetched.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(refetched.json()).toMatchObject({
            data: {
                messages: [{ text: "Hello, world!" }],
            },
        });
    });

    it("should invalidate the cache when a message is updated", async () => {
        const message = await createMessage({ prisma: server.prisma });

        const primed = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(primed.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);

        const updated = await server.inject({
            method: "PATCH",
            url: `/api/messages/${message.id}`,
            body: { text: "Updated text" },
        });

        await waitForMessageJob({ server, jobId: updated.json().data.jobId });

        const refetched = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(refetched.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(refetched.json()).toMatchObject({
            data: {
                messages: [{ text: "Updated text" }],
            },
        });
    });

    it("should invalidate the cache when a message is deleted", async () => {
        const message = await createMessage({ prisma: server.prisma });

        const primed = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(primed.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(primed.json()).toMatchObject({
            data: { messages: [{ id: message.id }] },
        });

        const deleted = await server.inject({
            method: "DELETE",
            url: `/api/messages/${message.id}`,
        });

        await waitForMessageJob({ server, jobId: deleted.json().data.jobId });

        const refetched = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(refetched.headers[CACHE_STATUS_HEADER]).toBe(CACHE_STATUS_MISS);
        expect(refetched.json()).toMatchObject({ data: { messages: [] } });
    });
});
