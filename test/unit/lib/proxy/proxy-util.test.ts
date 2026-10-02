import { describe, expect, it } from "vitest";
import { resolveTrustProxy } from "@/lib/proxy/proxy.util.js";

describe("resolveTrustProxy", () => {
    it("parses a decimal hop count", () => {
        expect(resolveTrustProxy("0")).toBe(0);
        expect(resolveTrustProxy(" 2 ")).toBe(2);
    });

    it.each(["", undefined, "true", "false", "0x10", "1e3", "-1", "1.5", "11"])(
        "rejects %o",
        (value) => {
            expect(() => resolveTrustProxy(value)).toThrow();
        }
    );
});
