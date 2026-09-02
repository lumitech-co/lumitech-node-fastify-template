import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it } from "vitest";
import { createMessages } from "../../factories/message.factory.js";

type MessageRow = { id: number };

type InjectResponse = Awaited<ReturnType<FastifyInstance["inject"]>>;

const idsOf = (response: InjectResponse): number[] =>
    (response.json().data.messages as MessageRow[]).map(
        (message) => message.id
    );

describe("GET /api/messages - cursor pagination", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer();

        return async () => {
            await server.close();
        };
    });

    const seedDescendingIds = async (count: number): Promise<number[]> => {
        const seeded = await createMessages({
            prisma: server.prisma,
            count,
        });

        return seeded.map((message) => message.id).sort((a, b) => b - a);
    };

    it("should return newest-first up to the limit and expose the next cursor", async () => {
        const descIds = await seedDescendingIds(5);

        const response = await server.inject({
            method: "GET",
            url: "/api/messages?limit=2",
        });

        expect(response.statusCode).toBe(200);
        expect(idsOf(response)).toEqual([descIds[0], descIds[1]]);
        expect(response.json().data.nextCursor).toBe(descIds[1]);
    });

    it("should page forward from a cursor without repeating rows", async () => {
        const descIds = await seedDescendingIds(5);

        const second = await server.inject({
            method: "GET",
            url: `/api/messages?limit=2&cursor=${descIds[1]}`,
        });

        expect(idsOf(second)).toEqual([descIds[2], descIds[3]]);
        expect(second.json().data.nextCursor).toBe(descIds[3]);
    });

    it("should return null nextCursor on the final partial page", async () => {
        const descIds = await seedDescendingIds(5);

        const last = await server.inject({
            method: "GET",
            url: `/api/messages?limit=2&cursor=${descIds[3]}`,
        });

        expect(idsOf(last)).toEqual([descIds[4]]);
        expect(last.json().data.nextCursor).toBeNull();
    });

    it("should walk the whole list exactly once across pages", async () => {
        const descIds = await seedDescendingIds(7);

        const collected: number[] = [];
        let cursor: number | null = null;

        do {
            const query: string = cursor
                ? `/api/messages?limit=3&cursor=${cursor}`
                : "/api/messages?limit=3";

            const page = await server.inject({ method: "GET", url: query });

            collected.push(...idsOf(page));
            cursor = page.json().data.nextCursor as number | null;
        } while (cursor !== null && collected.length < descIds.length);

        expect(collected).toEqual(descIds);
    });

    it("should return an empty page with null cursor past the end", async () => {
        const descIds = await seedDescendingIds(2);

        const primed = await server.inject({
            method: "GET",
            url: "/api/messages?limit=2",
        });

        expect(primed.json().data.nextCursor).toBe(descIds[1]);

        const beyond = await server.inject({
            method: "GET",
            url: `/api/messages?limit=2&cursor=${descIds[1]}`,
        });

        expect(idsOf(beyond)).toEqual([]);
        expect(beyond.json().data.nextCursor).toBeNull();
    });

    it("should default the limit when none is provided", async () => {
        await seedDescendingIds(3);

        const response = await server.inject({
            method: "GET",
            url: "/api/messages",
        });

        expect(idsOf(response)).toHaveLength(3);
        expect(response.json().data.nextCursor).toBeNull();
    });

    it("should reject a limit above the maximum", async () => {
        const response = await server.inject({
            method: "GET",
            url: "/api/messages?limit=101",
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toHaveProperty("error");
    });

    it("should reject a non-positive limit", async () => {
        const response = await server.inject({
            method: "GET",
            url: "/api/messages?limit=0",
        });

        expect(response.statusCode).toBe(400);
    });

    it("should reject a non-numeric cursor", async () => {
        const response = await server.inject({
            method: "GET",
            url: "/api/messages?cursor=abc",
        });

        expect(response.statusCode).toBe(400);
    });
});
