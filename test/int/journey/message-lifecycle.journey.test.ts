import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createMessages } from "../factories/message.factory.js";
import { waitForMessageJob } from "../helpers/wait-for-message-job.js";

describe("journey: create a message then read it back", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer();

        return async () => {
            await server.close();
        };
    });

    it("enqueues a message over HTTP and returns it from the list endpoint once processed", async () => {
        const existing = await createMessages({
            prisma: server.prisma,
            count: 2,
        });

        const createResponse = await server.inject({
            method: "POST",
            url: "/api/messages",
            body: { text: "Hello, world!" },
        });

        expect(createResponse.statusCode).toBe(200);

        const { jobId } = createResponse.json().data;

        await waitForMessageJob({ server, jobId });

        const listResponse = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(listResponse.statusCode).toBe(200);

        const { messages } = listResponse.json().data;

        expect(messages).toHaveLength(existing.length + 1);

        expect(
            messages.map((message: { text: string }) => message.text)
        ).toContain("Hello, world!");
    });
});
