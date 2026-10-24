import { describe, expect, it } from "vitest";
import {
    decryptSecret,
    encryptSecret,
} from "@/lib/secretCipher/secretCipher.util.js";

const appSecret = "a-long-random-application-secret";

describe("secretCipher", () => {
    it("round-trips a value, empty included", () => {
        for (const plain of ["sk_live_123", "", "ünïcødé"]) {
            const encrypted = encryptSecret({ plain, appSecret });

            expect(decryptSecret({ encrypted, appSecret })).toBe(plain);
        }
    });

    it("uses a fresh IV for every call", () => {
        const plain = "same";

        expect(encryptSecret({ plain, appSecret })).not.toBe(
            encryptSecret({ plain, appSecret })
        );
    });

    it("returns null for the wrong key", () => {
        const encrypted = encryptSecret({ plain: "value", appSecret });

        expect(
            decryptSecret({ encrypted, appSecret: "another-secret" })
        ).toBeNull();
    });

    it("returns null for a tampered ciphertext", () => {
        const [iv, tag, data = ""] = encryptSecret({
            plain: "value",
            appSecret,
        }).split(":");

        const flipped = `${data.startsWith("0") ? "1" : "0"}${data.slice(1)}`;

        expect(
            decryptSecret({ encrypted: `${iv}:${tag}:${flipped}`, appSecret })
        ).toBeNull();
    });

    it.each(["", "abc", "a:b", "a:b:c:d", "zz:zz:zz"])(
        "returns null for the malformed value %j",
        (encrypted) => {
            expect(decryptSecret({ encrypted, appSecret })).toBeNull();
        }
    );

    it("returns null for an extra trailing part", () => {
        const encrypted = encryptSecret({ plain: "value", appSecret });

        expect(
            decryptSecret({ encrypted: `${encrypted}:00`, appSecret })
        ).toBeNull();
    });
});
