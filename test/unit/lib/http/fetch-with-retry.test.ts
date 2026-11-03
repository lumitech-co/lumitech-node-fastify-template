import { describe, expect, it, vi } from "vitest";
import { makeFetchWithRetry } from "@/lib/http/fetchWithRetry.js";

const URL_ = "https://api.example.com/items";

const respond = (status: number, headers: Record<string, string> = {}) =>
    new Response(status === 204 ? null : "{}", { status, headers });

const build = (responses: (Response | Error)[]) => {
    const baseFetch = vi.fn<typeof fetch>();

    for (const response of responses) {
        if (response instanceof Error) {
            baseFetch.mockRejectedValueOnce(response);
        } else {
            baseFetch.mockResolvedValueOnce(response);
        }
    }

    return {
        baseFetch,
        fetch: makeFetchWithRetry({ baseDelayMs: 0, baseFetch }),
    };
};

describe("makeFetchWithRetry", () => {
    it("returns a successful response without retrying", async () => {
        const { baseFetch, fetch } = build([respond(200)]);

        await expect(fetch(URL_)).resolves.toHaveProperty("status", 200);
        expect(baseFetch).toHaveBeenCalledTimes(1);
    });

    it("retries a 503 on GET and returns the later success", async () => {
        const { baseFetch, fetch } = build([respond(503), respond(200)]);

        await expect(fetch(URL_)).resolves.toHaveProperty("status", 200);
        expect(baseFetch).toHaveBeenCalledTimes(2);
    });

    it("returns the last failure once attempts run out", async () => {
        const { baseFetch, fetch } = build([
            respond(502),
            respond(503),
            respond(504),
        ]);

        await expect(fetch(URL_)).resolves.toHaveProperty("status", 504);
        expect(baseFetch).toHaveBeenCalledTimes(3);
    });

    it("does not retry a 503 on POST", async () => {
        const { baseFetch, fetch } = build([respond(503)]);

        await expect(fetch(URL_, { method: "POST" })).resolves.toHaveProperty(
            "status",
            503
        );

        expect(baseFetch).toHaveBeenCalledTimes(1);
    });

    it("retries a 429 on POST, honouring Retry-After", async () => {
        const { baseFetch, fetch } = build([
            respond(429, { "retry-after": "0" }),
            respond(201),
        ]);

        await expect(fetch(URL_, { method: "POST" })).resolves.toHaveProperty(
            "status",
            201
        );

        expect(baseFetch).toHaveBeenCalledTimes(2);
    });

    it("retries a 403 only when it carries Retry-After", async () => {
        const limited = build([
            respond(403, { "retry-after": "0" }),
            respond(200),
        ]);

        await expect(limited.fetch(URL_)).resolves.toHaveProperty(
            "status",
            200
        );

        const forbidden = build([respond(403)]);

        await expect(forbidden.fetch(URL_)).resolves.toHaveProperty(
            "status",
            403
        );

        expect(forbidden.baseFetch).toHaveBeenCalledTimes(1);
    });

    it("does not retry a 4xx", async () => {
        const { baseFetch, fetch } = build([respond(404)]);

        await expect(fetch(URL_)).resolves.toHaveProperty("status", 404);
        expect(baseFetch).toHaveBeenCalledTimes(1);
    });

    it("retries a network error on GET", async () => {
        const { baseFetch, fetch } = build([
            new Error("ECONNRESET"),
            respond(200),
        ]);

        await expect(fetch(URL_)).resolves.toHaveProperty("status", 200);
        expect(baseFetch).toHaveBeenCalledTimes(2);
    });

    it("rethrows a network error on POST at once", async () => {
        const { baseFetch, fetch } = build([new Error("ECONNRESET")]);

        await expect(fetch(URL_, { method: "POST" })).rejects.toThrow(
            "ECONNRESET"
        );

        expect(baseFetch).toHaveBeenCalledTimes(1);
    });

    it("rethrows the last network error once attempts run out", async () => {
        const { fetch } = build([
            new Error("one"),
            new Error("two"),
            new Error("three"),
        ]);

        await expect(fetch(URL_)).rejects.toThrow("three");
    });

    it("reads the method from a Request input", async () => {
        const { baseFetch, fetch } = build([respond(503), respond(200)]);

        await fetch(new Request(URL_, { method: "DELETE" }));
        expect(baseFetch).toHaveBeenCalledTimes(2);

        const post = build([respond(503)]);

        await post.fetch(new Request(URL_, { method: "PATCH" }));
        expect(post.baseFetch).toHaveBeenCalledTimes(1);
    });

    it("retries writes when retryNonIdempotent is set", async () => {
        const baseFetch = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(respond(503))
            .mockResolvedValueOnce(respond(200));

        const fetch = makeFetchWithRetry({
            baseDelayMs: 0,
            retryNonIdempotent: true,
            baseFetch,
        });

        await expect(fetch(URL_, { method: "POST" })).resolves.toHaveProperty(
            "status",
            200
        );
    });
});
