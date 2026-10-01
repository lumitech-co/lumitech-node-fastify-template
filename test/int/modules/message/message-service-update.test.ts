import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMessage } from "../../factories/message.factory.js";
import { waitForMessageJob } from "../../helpers/wait-for-message-job.js";

const MISSING_ID = "019a0000-0000-7000-8000-000000000000";

describe("PUT /api/messages/:id", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer();

        return async () => {
            await server.close();
        };
    });

    it("should enqueue an update and persist it through the worker", async () => {
        const message = await createMessage({ prisma: server.prisma });

        const response = await server.inject({
            method: "PUT",
            url: `/api/messages/${message.id}`,
            body: { text: "Updated text" },
        });

        const json = response.json();

        expect(response.statusCode).toBe(200);
        expect(json.data.jobId).toEqual(expect.any(String));

        await waitForMessageJob({ server, jobId: json.data.jobId });

        const stored = await server.prisma.message.findUniqueOrThrow({
            where: { id: message.id },
        });

        expect(stored.text).toBe("Updated text");
    });

    it("should update only the provided fields", async () => {
        const message = await createMessage({
            prisma: server.prisma,
            overrides: { meta: { source: "web" } },
        });

        const response = await server.inject({
            method: "PUT",
            url: `/api/messages/${message.id}`,
            body: { text: "New text only" },
        });

        await waitForMessageJob({ server, jobId: response.json().data.jobId });

        const stored = await server.prisma.message.findUniqueOrThrow({
            where: { id: message.id },
        });

        expect(stored.text).toBe("New text only");
        expect(stored.meta).toEqual({ source: "web" });
    });

    it("should return 404 without enqueueing a job when the id does not exist", async () => {
        const add = vi.spyOn(server.messageQueue, "add");

        const response = await server.inject({
            method: "PUT",
            url: `/api/messages/${MISSING_ID}`,
            body: { text: "Does not matter" },
        });

        expect(response.statusCode).toBe(404);
        expect(add).not.toHaveBeenCalled();
    });

    it("should reject an empty body", async () => {
        const message = await createMessage({ prisma: server.prisma });

        const response = await server.inject({
            method: "PUT",
            url: `/api/messages/${message.id}`,
            body: {},
        });

        expect(response.statusCode).toBe(400);
    });

    it("should reject an id that is not a UUID v7", async () => {
        const response = await server.inject({
            method: "PUT",
            url: "/api/messages/not-a-uuid",
            body: { text: "Updated text" },
        });

        expect(response.statusCode).toBe(400);
    });

    it("should skip a write enqueued before the stored one", async () => {
        const message = await createMessage({
            prisma: server.prisma,
            overrides: { updatedAt: new Date("2026-01-02T00:00:00.000Z") },
        });

        const result = await server.di.resolve("messageService").updateMessage({
            id: message.id,
            text: "Stale retry",
            enqueuedAt: new Date("2026-01-01T00:00:00.000Z"),
        });

        const stored = await server.prisma.message.findUniqueOrThrow({
            where: { id: message.id },
        });

        expect(result).toEqual({ id: message.id });
        expect(stored.text).toBe(message.text);
    });
});
