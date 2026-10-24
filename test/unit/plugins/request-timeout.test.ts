import Fastify from "fastify";
import requestTimeoutPlugin from "@/plugins/requestTimeout.js";
import type { FastifyInstance } from "fastify";
import {
    afterAll,
    afterEach,
    beforeAll,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import {
    REQUEST_TIMEOUT_MS,
    REQUEST_TIMEOUT_RESPONSE,
} from "@/lib/constants/requestTimeout.constant.js";

const AFTER_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 10_000;

describe("request timeout plugin", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = Fastify();

        await app.register(requestTimeoutPlugin);

        app.get("/hang", () => new Promise(() => undefined));

        app.get("/stream", (_request, reply) => {
            reply.raw.writeHead(200, { "content-type": "text/plain" });
            reply.raw.write("start");

            setTimeout(() => reply.raw.end("done"), AFTER_TIMEOUT_MS);
        });

        app.get(
            "/slow-upgrade",
            (_request, reply) =>
                new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(reply.send({ ok: true }));
                    }, AFTER_TIMEOUT_MS);
                })
        );

        app.get("/fast", async () => ({ ok: true }));

        await app.ready();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    afterAll(async () => {
        await app.close();
    });

    it("answers a hung request with 503 after the timeout", async () => {
        vi.useFakeTimers();

        const pending = app.inject({ url: "/hang?token=abc" });

        await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

        const response = await pending;

        expect(response.statusCode).toBe(503);
        expect(response.json()).toEqual(REQUEST_TIMEOUT_RESPONSE);
    });

    it("leaves a response that already flushed its headers alone", async () => {
        vi.useFakeTimers();

        const pending = app.inject({ url: "/stream" });

        await vi.advanceTimersByTimeAsync(AFTER_TIMEOUT_MS);

        const response = await pending;

        expect(response.statusCode).toBe(200);
        expect(response.payload).toBe("startdone");
    });

    it("skips a connection upgrade", async () => {
        vi.useFakeTimers();

        const pending = app.inject({
            url: "/slow-upgrade",
            headers: { upgrade: "websocket" },
        });

        await vi.advanceTimersByTimeAsync(AFTER_TIMEOUT_MS);

        const response = await pending;

        expect(response.statusCode).toBe(200);
    });

    it("does not touch a request that finishes in time", async () => {
        const response = await app.inject({ url: "/fast" });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ ok: true });
    });
});
