import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it } from "vitest";
import { waitForMessageJob } from "../../helpers/wait-for-message-job.js";

describe("POST /api/messages", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer();

        return async () => {
            await server.close();
        };
    });

    it("should enqueue a message and persist it through the worker", async () => {
        const response = await server.inject({
            method: "POST",
            url: "/api/messages",
            body: {
                text: "Hello, world!",
            },
        });

        const { statusCode } = response;
        const json = response.json();

        expect(statusCode).toBe(200);
        expect(json.data.jobId).toEqual(expect.any(String));

        await waitForMessageJob({ server, jobId: json.data.jobId });

        const list = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(list.json()).toMatchObject({
            data: {
                messages: [
                    {
                        id: 1,
                        createdAt: expect.any(String),
                        text: "Hello, world!",
                    },
                ],
            },
        });
    });

    it("should reject a message with missing text", async () => {
        const response = await server.inject({
            method: "POST",
            url: "/api/messages",
            body: {
                // Missing text property
            },
        });

        const { statusCode } = response;
        const json = response.json();

        expect(statusCode).toBe(400);
        expect(json).toHaveProperty("error");
    });
});
