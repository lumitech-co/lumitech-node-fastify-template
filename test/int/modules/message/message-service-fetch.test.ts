import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { messages } from "@/database/drizzle/schema.js";
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

        await server.db.insert(messages).values(mockData);

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
                nextCursor: null,
            },
        });
    });

    it("should paginate messages newest-first via the cursor", async () => {
        await server.db.insert(messages).values(
            Array.from({ length: 5 }, (_, index) => ({
                text: `message ${index + 1}`,
            }))
        );

        const firstPage = await server.inject({
            method: "GET",
            url: "/api/messages?limit=2",
        });

        expect(firstPage.statusCode).toBe(200);

        const firstJson = firstPage.json();
        const firstIds = firstJson.data.messages.map(
            (message: { id: number }) => message.id
        );

        expect(firstIds).toEqual([5, 4]);
        expect(firstJson.data.nextCursor).toBe(4);

        const secondPage = await server.inject({
            method: "GET",
            url: `/api/messages?limit=2&cursor=${firstJson.data.nextCursor}`,
        });

        const secondJson = secondPage.json();
        const secondIds = secondJson.data.messages.map(
            (message: { id: number }) => message.id
        );

        expect(secondIds).toEqual([3, 2]);
        expect(secondJson.data.nextCursor).toBe(2);

        const lastPage = await server.inject({
            method: "GET",
            url: `/api/messages?limit=2&cursor=${secondJson.data.nextCursor}`,
        });

        const lastJson = lastPage.json();
        const lastIds = lastJson.data.messages.map(
            (message: { id: number }) => message.id
        );

        expect(lastIds).toEqual([1]);
        expect(lastJson.data.nextCursor).toBeNull();
    });

    it("should reject an invalid limit", async () => {
        const response = await server.inject({
            method: "GET",
            url: "/api/messages?limit=0",
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toHaveProperty("error");
    });
});
