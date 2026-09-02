import { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";
import { createCacheKey, createRouteCacheKey } from "@/lib/cache/cache.util.js";
import {
    CACHE_KEY_HASH_LENGTH,
    CACHE_KEY_PREFIX,
} from "@/lib/cache/cache.constant.js";
import { RouteCacheOptions } from "@/lib/cache/cache.type.js";

type BuildRequestPayload = {
    method?: string;
    url?: string;
    host?: string;
    routeUrl?: string;
    headers?: Record<string, string>;
};

const buildRequest = ({
    method = "GET",
    url = "/api/messages",
    host = "localhost",
    routeUrl = "/api/messages",
    headers = {},
}: BuildRequestPayload = {}): FastifyRequest =>
    ({
        method,
        url,
        headers: { host, ...headers },
        routeOptions: { url: routeUrl },
    }) as unknown as FastifyRequest;

const routeKey = (
    request: FastifyRequest,
    options: RouteCacheOptions = {}
): string => createRouteCacheKey({ request, options });

describe("cache.util - createCacheKey", () => {
    it("should produce a prefixed, namespaced, fixed-length-hash key", () => {
        const key = createCacheKey({
            namespace: "message",
            segments: ["a", "b"],
        });

        const [prefix, namespace, hash] = key.split(":");

        expect(prefix).toBe(CACHE_KEY_PREFIX);
        expect(namespace).toBe("message");
        expect(hash).toHaveLength(CACHE_KEY_HASH_LENGTH);
    });

    it("should be deterministic for the same segments", () => {
        const first = createCacheKey({ namespace: "ns", segments: ["x", "y"] });
        const second = createCacheKey({
            namespace: "ns",
            segments: ["x", "y"],
        });

        expect(first).toBe(second);
    });

    it("should change the hash when a segment changes", () => {
        const first = createCacheKey({ namespace: "ns", segments: ["x", "y"] });
        const second = createCacheKey({
            namespace: "ns",
            segments: ["x", "z"],
        });

        expect(first).not.toBe(second);
    });
});

describe("cache.util - createRouteCacheKey", () => {
    it("should be independent of query-parameter order", () => {
        const ordered = routeKey(
            buildRequest({ url: "/api/messages?a=1&b=2" })
        );
        const shuffled = routeKey(
            buildRequest({ url: "/api/messages?b=2&a=1" })
        );

        expect(ordered).toBe(shuffled);
    });

    it("should distinguish different query values", () => {
        const one = routeKey(buildRequest({ url: "/api/messages?page=1" }));
        const two = routeKey(buildRequest({ url: "/api/messages?page=2" }));

        expect(one).not.toBe(two);
    });

    it("should include the HTTP method in the key", () => {
        const get = routeKey(buildRequest({ method: "GET" }));
        const head = routeKey(buildRequest({ method: "HEAD" }));

        expect(get).not.toBe(head);
    });

    it("should default the namespace to method + route url", () => {
        const key = routeKey(
            buildRequest({ method: "GET", routeUrl: "/api/messages" })
        );

        expect(key.startsWith(`${CACHE_KEY_PREFIX}:GET:/api/messages:`)).toBe(
            true
        );
    });

    it("should honour an explicit namespace over the default", () => {
        const key = routeKey(buildRequest(), { namespace: "messages" });

        expect(key.startsWith(`${CACHE_KEY_PREFIX}:messages:`)).toBe(true);
    });

    it("should isolate entries per varyBy value", () => {
        const options: RouteCacheOptions = {
            varyBy: (request) => String(request.headers["x-user"] ?? ""),
        };

        const alice = routeKey(
            buildRequest({ headers: { "x-user": "alice" } }),
            options
        );
        const aliceAgain = routeKey(
            buildRequest({ headers: { "x-user": "alice" } }),
            options
        );
        const bob = routeKey(
            buildRequest({ headers: { "x-user": "bob" } }),
            options
        );

        expect(alice).toBe(aliceAgain);
        expect(alice).not.toBe(bob);
    });

    it("should isolate entries per varyByHeaders value", () => {
        const options: RouteCacheOptions = {
            varyByHeaders: ["accept-language"],
        };

        const english = routeKey(
            buildRequest({ headers: { "accept-language": "en" } }),
            options
        );
        const german = routeKey(
            buildRequest({ headers: { "accept-language": "de" } }),
            options
        );

        expect(english).not.toBe(german);
    });

    it("should treat a missing varyByHeaders header as an empty value", () => {
        const options: RouteCacheOptions = {
            varyByHeaders: ["accept-language"],
        };

        const missing = routeKey(buildRequest(), options);
        const empty = routeKey(
            buildRequest({ headers: { "accept-language": "" } }),
            options
        );

        expect(missing).toBe(empty);
    });
});
