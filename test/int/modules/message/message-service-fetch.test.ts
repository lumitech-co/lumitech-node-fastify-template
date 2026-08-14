import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createMessage } from "../../factories/message.factory.js";

describe("GET /api/messages", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer();

        return async () => {
            await server.close();
        };
    });

    it("should fetch messages", async () => {
        const message = await createMessage({ prisma: server.prisma });

        const response = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        const { statusCode } = response;
        const json = response.json();

        expect(statusCode).toBe(200);

        expect(json).toMatchObject({
            data: {
                messages: [
                    {
                        id: message.id,
                        createdAt: message.createdAt.toISOString(),
                        text: message.text,
                    },
                ],
            },
        });
    });

    it("should fetch an empty list when nothing is seeded", async () => {
        const response = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        const { statusCode } = response;
        const json = response.json();

        expect(statusCode).toBe(200);

        expect(json).toMatchObject({
            data: {
                messages: [],
            },
        });
    });
});
