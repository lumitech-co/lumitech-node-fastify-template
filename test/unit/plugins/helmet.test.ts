import Fastify from "fastify";
import helmetPlugin from "@/plugins/helmet.js";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SWAGGER_ROUTE_PREFIX } from "@/lib/constants/swagger.constant.js";
import {
    HELMET_DOCS_CONTENT_SECURITY_POLICY,
    HELMET_PERMISSIONS_POLICY,
} from "@/lib/constants/helmet.constant.js";

describe("helmet plugin", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = Fastify();

        await app.register(helmetPlugin);

        app.get("/api/messages", async () => ({ ok: true }));
        app.get(SWAGGER_ROUTE_PREFIX, async () => "<html></html>");

        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it("locks API routes down to a no-load content security policy", async () => {
        const response = await app.inject({ url: "/api/messages" });

        expect(response.headers["content-security-policy"]).toBe(
            "default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none';object-src 'none'"
        );
    });

    it("sets transport, sniffing, framing and referrer headers", async () => {
        const response = await app.inject({ url: "/api/messages" });

        expect(response.headers["strict-transport-security"]).toBe(
            "max-age=15552000; includeSubDomains"
        );

        expect(response.headers["x-content-type-options"]).toBe("nosniff");
        expect(response.headers["x-frame-options"]).toBe("DENY");
        expect(response.headers["referrer-policy"]).toBe("no-referrer");

        expect(response.headers["cross-origin-resource-policy"]).toBe(
            "same-origin"
        );
    });

    it("denies every powerful browser feature", async () => {
        const response = await app.inject({ url: "/api/messages" });

        expect(response.headers["permissions-policy"]).toBe(
            HELMET_PERMISSIONS_POLICY
        );
    });

    it("gives the Swagger UI a policy it can render under", async () => {
        const response = await app.inject({ url: SWAGGER_ROUTE_PREFIX });

        expect(response.headers["content-security-policy"]).toBe(
            HELMET_DOCS_CONTENT_SECURITY_POLICY
        );
    });
});
