import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createMessages } from "../factories/message.factory.js";

/**
 * Journey test: the whole flow lives in ONE `it`.
 *
 * The setup truncates every table in a global `beforeEach`, so a second `it`
 * would start from an empty database. Splitting a journey across cases is the
 * most common way to write an integration test that only passes in file order —
 * keep arrange, act and assert inside a single case.
 */
describe("journey: create a message then read it back", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer();

        return async () => {
            await server.close();
        };
    });

    it("creates a message over HTTP and returns it from the list endpoint", async () => {
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

        const created = createResponse.json().data.message;

        const listResponse = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(listResponse.statusCode).toBe(200);

        const { messages } = listResponse.json().data;

        expect(messages).toHaveLength(existing.length + 1);

        expect(messages.map((message: { id: number }) => message.id)).toContain(
            created.id
        );
    });
});
