import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createMessage } from "../../factories/message.factory.js";
import { waitForMessageJob } from "../../helpers/wait-for-message-job.js";

describe("PATCH /api/messages/:id", () => {
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
            method: "PATCH",
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
            method: "PATCH",
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

    it("should fail the job when the id does not exist", async () => {
        const response = await server.inject({
            method: "PATCH",
            url: "/api/messages/999999",
            body: { text: "Does not matter" },
        });

        expect(response.statusCode).toBe(200);

        await expect(
            waitForMessageJob({ server, jobId: response.json().data.jobId })
        ).rejects.toThrow(/failed/);
    });

    it("should reject an empty body", async () => {
        const message = await createMessage({ prisma: server.prisma });

        const response = await server.inject({
            method: "PATCH",
            url: `/api/messages/${message.id}`,
            body: {},
        });

        expect(response.statusCode).toBe(400);
    });

    it("should reject a non-numeric id", async () => {
        const response = await server.inject({
            method: "PATCH",
            url: "/api/messages/not-a-number",
            body: { text: "Updated text" },
        });

        expect(response.statusCode).toBe(400);
    });
});
