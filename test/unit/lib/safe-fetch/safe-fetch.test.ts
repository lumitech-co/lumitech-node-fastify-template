import { z } from "zod";
import { EventEmitter } from "node:events";
import type { LookupAddress } from "node:dns";
import type { ClientRequest } from "node:http";
import { describe, expect, it, vi } from "vitest";
import type { SafeFetchDeps } from "@/lib/safeFetch/safeFetch.type.js";
import {
    createResolveHost,
    createSafeFetchJson,
    pinnedLookup,
} from "@/lib/safeFetch/safeFetch.js";
import {
    isBlockedAddress,
    isTransientSafeFetchFailure,
    parseSafeFetchUrl,
} from "@/lib/safeFetch/safeFetch.util.js";

const schema = z.object({ name: z.string() });
const LIMITS = { maxBytes: 1024, timeoutMs: 1000 };
const PUBLIC: LookupAddress = { address: "93.184.216.34", family: 4 };
const METADATA: LookupAddress = { address: "169.254.169.254", family: 4 };

type FakeResponse = {
    status: number;
    headers?: Record<string, string>;
    body?: string;
};

const fakeRequest =
    (response: FakeResponse | "network-error" | "hang") =>
    (): ClientRequest => {
        const req = new EventEmitter() as EventEmitter & {
            end: () => void;
            destroy: () => void;
        };

        req.destroy = vi.fn();

        req.end = () => {
            setImmediate(() => {
                if (response === "hang") {
                    return;
                }

                if (response === "network-error") {
                    req.emit("error", new Error("ECONNRESET"));

                    return;
                }

                const res = Object.assign(new EventEmitter(), {
                    statusCode: response.status,
                    headers: {
                        "content-type": "application/json",
                        ...response.headers,
                    },
                });

                req.emit("response", res);
                res.emit("data", Buffer.from(response.body ?? ""));
                res.emit("end");
            });
        };

        return req as unknown as ClientRequest;
    };

const build = (
    deps: Partial<SafeFetchDeps> & {
        response?: Parameters<typeof fakeRequest>[0];
    }
) =>
    createSafeFetchJson({
        resolveHost: deps.resolveHost ?? (async () => [PUBLIC]),
        request:
            deps.request ??
            fakeRequest(
                deps.response ?? { status: 200, body: '{"name":"ok"}' }
            ),
    });

describe("isBlockedAddress", () => {
    it.each([
        "10.0.0.1",
        "172.16.5.4",
        "192.168.1.1",
        "127.0.0.1",
        "169.254.169.254",
        "100.64.0.1",
        "0.0.0.0",
        "::1",
        "fc00::1",
        "fe80::1",
        "::ffff:10.0.0.1",
        "::1.2.3.4",
        "not-an-ip",
    ])("blocks %s", (address) => {
        expect(isBlockedAddress(address)).toBe(true);
    });

    it.each(["93.184.216.34", "8.8.8.8", "2606:4700::1111"])(
        "allows the public address %s",
        (address) => {
            expect(isBlockedAddress(address)).toBe(false);
        }
    );
});

describe("parseSafeFetchUrl", () => {
    it.each([
        "http://example.com/doc",
        "https://user:pass@example.com/doc",
        "https://example.com/a/../doc",
        "https://example.com/a/%2E%2E/doc",
        "https://example.com\\doc",
        "https:///doc",
        "https://exa mple.com",
    ])("refuses %s", (url) => {
        expect(parseSafeFetchUrl(url)).toBeNull();
    });

    it("accepts an HTTPS URL with a query", () => {
        expect(parseSafeFetchUrl("https://example.com/doc?id=1")?.href).toBe(
            "https://example.com/doc?id=1"
        );
    });
});

describe("isTransientSafeFetchFailure", () => {
    it("treats transport failures, 5xx and 429 as transient", () => {
        expect(
            isTransientSafeFetchFailure({
                ok: false,
                reason: "dns",
                status: null,
            })
        ).toBe(true);

        expect(
            isTransientSafeFetchFailure({
                ok: false,
                reason: "status",
                status: 503,
            })
        ).toBe(true);

        expect(
            isTransientSafeFetchFailure({
                ok: false,
                reason: "status",
                status: 429,
            })
        ).toBe(true);

        expect(
            isTransientSafeFetchFailure({
                ok: false,
                reason: "status",
                status: 404,
            })
        ).toBe(false);
    });
});

describe("pinnedLookup", () => {
    it("answers both callback shapes with the pinned address", () => {
        const lookup = pinnedLookup(PUBLIC);
        const single = vi.fn();
        const all = vi.fn();

        lookup("example.com", {}, single);
        lookup("example.com", { all: true }, all);

        expect(single).toHaveBeenCalledWith(
            null,
            PUBLIC.address,
            PUBLIC.family
        );

        expect(all).toHaveBeenCalledWith(null, [PUBLIC]);
    });
});

describe("createResolveHost", () => {
    it("returns an IP literal without resolving it", async () => {
        const createResolver = vi.fn();
        const resolveHost = createResolveHost(createResolver);

        await expect(
            resolveHost({ hostname: "8.8.8.8", timeoutMs: 100 })
        ).resolves.toEqual([{ address: "8.8.8.8", family: 4 }]);

        expect(createResolver).not.toHaveBeenCalled();
    });

    it("merges A and AAAA answers and ignores a failed family", async () => {
        const resolveHost = createResolveHost(() => ({
            resolve4: async () => ["93.184.216.34"],
            resolve6: async () => {
                throw new Error("ENODATA");
            },
        }));

        await expect(
            resolveHost({ hostname: "example.com", timeoutMs: 100 })
        ).resolves.toEqual([{ address: "93.184.216.34", family: 4 }]);
    });
});

describe("createSafeFetchJson", () => {
    const url = "https://example.com/doc";

    it("returns the validated body", async () => {
        await expect(build({})({ url, schema, ...LIMITS })).resolves.toEqual({
            ok: true,
            body: { name: "ok" },
            cacheControl: null,
        });
    });

    it.each<[string, Parameters<typeof build>[0], string]>([
        ["a URL it refuses to parse", {}, "invalid_url"],
        [
            "a host that does not resolve",
            { resolveHost: async () => [] },
            "dns",
        ],
        [
            "a host with one private answer",
            { resolveHost: async () => [PUBLIC, METADATA] },
            "blocked_address",
        ],
        ["a redirect", { response: { status: 302 } }, "redirect"],
        [
            "a non-JSON response",
            {
                response: {
                    status: 200,
                    headers: { "content-type": "text/html" },
                },
            },
            "content_type",
        ],
        [
            "a body over the size cap",
            {
                response: {
                    status: 200,
                    body: `{"name":"${"x".repeat(2048)}"}`,
                },
            },
            "too_large",
        ],
        [
            "a malformed body",
            { response: { status: 200, body: "{" } },
            "invalid_json",
        ],
        [
            "a body that fails the schema",
            { response: { status: 200, body: '{"name":1}' } },
            "invalid_body",
        ],
        ["a dropped connection", { response: "network-error" }, "network"],
    ])("refuses %s", async (name, deps, reason) => {
        const target =
            name === "a URL it refuses to parse" ? "http://example.com" : url;

        await expect(
            build(deps)({ url: target, schema, ...LIMITS })
        ).resolves.toMatchObject({ ok: false, reason });
    });

    it("reports a non-200 status with its code", async () => {
        await expect(
            build({ response: { status: 503 } })({ url, schema, ...LIMITS })
        ).resolves.toEqual({ ok: false, reason: "status", status: 503 });
    });

    it("gives up at the deadline", async () => {
        await expect(
            build({ response: "hang" })({
                url,
                schema,
                ...LIMITS,
                timeoutMs: 20,
            })
        ).resolves.toMatchObject({ ok: false, reason: "timeout" });
    });
});
