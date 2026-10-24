import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import {
    redactSecretQuery,
    serializeRequestForLog,
} from "@/lib/http/http.util.js";

describe("redactSecretQuery", () => {
    it.each([
        ["/hook?secret=abc", "/hook?secret=[redacted]"],
        ["/cb?code=abc&state=xyz", "/cb?code=[redacted]&state=[redacted]"],
        ["/x?page=2&token=abc#top", "/x?page=2&token=[redacted]#top"],
        ["/x?API_KEY=abc", "/x?API_KEY=[redacted]"],
        [
            "/x?access_token=a&password=b",
            "/x?access_token=[redacted]&password=[redacted]",
        ],
    ])("redacts %s", (url, expected) => {
        expect(redactSecretQuery(url)).toBe(expected);
    });

    it("keeps non-secret parameters and paths as they are", () => {
        expect(redactSecretQuery("/api/messages?cursor=1&limit=20")).toBe(
            "/api/messages?cursor=1&limit=20"
        );

        expect(redactSecretQuery("/api/tokens/secret")).toBe(
            "/api/tokens/secret"
        );
    });

    it("does not treat a parameter that only ends with a secret name as one", () => {
        expect(redactSecretQuery("/x?monkey=1&sortkey=2")).toBe(
            "/x?monkey=1&sortkey=2"
        );
    });
});

describe("serializeRequestForLog", () => {
    it("logs the request with its credentials blanked", () => {
        const request = {
            method: "GET",
            url: "/hook?secret=abc",
            host: "api.example.com",
            ip: "10.0.0.1",
            socket: { remotePort: 51234 },
        } as unknown as FastifyRequest;

        expect(serializeRequestForLog(request)).toEqual({
            method: "GET",
            url: "/hook?secret=[redacted]",
            host: "api.example.com",
            remoteAddress: "10.0.0.1",
            remotePort: 51234,
        });
    });

    it("omits the remote port when the socket has none", () => {
        const request = {
            method: "GET",
            url: "/",
            host: "localhost",
            ip: "127.0.0.1",
            socket: {},
        } as unknown as FastifyRequest;

        expect(serializeRequestForLog(request)).not.toHaveProperty(
            "remotePort"
        );
    });
});
