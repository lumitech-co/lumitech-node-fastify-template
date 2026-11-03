import { describe, expect, it } from "vitest";
import { hashing } from "@/lib/hashing/hashing.js";
import {
    generateOpaqueSecret,
    generateOpaqueToken,
} from "@/lib/hashing/opaqueToken.util.js";

describe("generateOpaqueToken", () => {
    it("returns `<id>.<secret>` and the hash of the secret only", () => {
        const { id, token, tokenHash } = generateOpaqueToken();
        const [tokenId, secret = ""] = token.split(".");

        expect(tokenId).toBe(id);
        expect(secret).toMatch(/^[0-9a-f]{64}$/u);
        expect(tokenHash).toBe(hashing.hashToken(secret));
    });

    it("never repeats", () => {
        expect(generateOpaqueToken().token).not.toBe(
            generateOpaqueToken().token
        );
    });
});

describe("generateOpaqueSecret", () => {
    it("returns a base64url secret and its hash", () => {
        const { token, tokenHash } = generateOpaqueSecret();

        expect(token).toMatch(/^[\w-]{43}$/u);
        expect(tokenHash).toBe(hashing.hashToken(token));
        expect(tokenHash).toMatch(/^[0-9a-f]{64}$/u);
    });
});
