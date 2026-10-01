import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMessage } from "../../factories/message.factory.js";
import { waitForMessageJob } from "../../helpers/wait-for-message-job.js";

const MISSING_ID = "019a0000-0000-7000-8000-000000000000";

describe("DELETE /api/messages/:id", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer();

        return async () => {
            await server.close();
        };
    });

    it("should enqueue a deletion and remove the row through the worker", async () => {
        const message = await createMessage({ prisma: server.prisma });

        const response = await server.inject({
            method: "DELETE",
            url: `/api/messages/${message.id}`,
        });

        const json = response.json();

        expect(response.statusCode).toBe(202);
        expect(json.data.jobId).toEqual(expect.any(String));

        await waitForMessageJob({ server, jobId: json.data.jobId });

        const stored = await server.prisma.message.findUnique({
            where: { id: message.id },
        });

        expect(stored).toBeNull();
    });

    it("should return 404 without enqueueing a job when the id does not exist", async () => {
        const add = vi.spyOn(server.messageQueue, "add");

        const response = await server.inject({
            method: "DELETE",
            url: `/api/messages/${MISSING_ID}`,
        });

        expect(response.statusCode).toBe(404);
        expect(add).not.toHaveBeenCalled();
    });

    it("should reject an id that is not a UUID v7", async () => {
        const response = await server.inject({
            method: "DELETE",
            url: "/api/messages/not-a-uuid",
        });

        expect(response.statusCode).toBe(400);
    });
});
