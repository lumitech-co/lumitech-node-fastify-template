import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it } from "vitest";

describe("GET /api/messages", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer();

        return async () => {
            await server.close();
        };
    });

    it("should fetch messages", async () => {
        const mockData = {
            text: "Hello, world!",
            createdAt: new Date(),
            id: 1,
        };

        await server.prisma.message.create({
            data: mockData,
        });

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
                        id: expect.any(Number),
                        createdAt: expect.any(String),
                        text: expect.any(String),
                    },
                ],
            },
        });
    });

    it("should fetch messages", async () => {
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
