import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createMessage } from "../../factories/message.factory.js";
import { waitForMessageJob } from "../../helpers/wait-for-message-job.js";

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

        expect(response.statusCode).toBe(200);
        expect(json.data.jobId).toEqual(expect.any(String));

        await waitForMessageJob({ server, jobId: json.data.jobId });

        const stored = await server.prisma.message.findUnique({
            where: { id: message.id },
        });

        expect(stored).toBeNull();
    });

    it("should fail the job when the id does not exist", async () => {
        const response = await server.inject({
            method: "DELETE",
            url: "/api/messages/999999",
        });

        expect(response.statusCode).toBe(200);

        await expect(
            waitForMessageJob({ server, jobId: response.json().data.jobId })
        ).rejects.toThrow(/failed/);
    });

    it("should reject a non-numeric id", async () => {
        const response = await server.inject({
            method: "DELETE",
            url: "/api/messages/not-a-number",
        });

        expect(response.statusCode).toBe(400);
    });
});
