import { describe, expect, it } from "vitest";
import { resolveLocale, translateMessage } from "@/lib/i18n/i18n.util.js";
import {
    RESPONSE_MESSAGES,
    RESPONSE_MESSAGE_TRANSLATIONS,
} from "@/lib/messages/messages.constant.js";

describe("resolveLocale", () => {
    it.each([
        [undefined, "en"],
        ["", "en"],
        ["uk", "uk"],
        ["uk-UA,uk;q=0.9", "uk"],
        ["de-DE,uk;q=0.5,en;q=0.8", "en"],
        ["de,fr;q=0.9", "en"],
        ["uk;q=0,en", "en"],
        ["EN-us", "en"],
    ])("%s → %s", (header, expected) => {
        expect(resolveLocale(header)).toBe(expected);
    });
});

describe("translateMessage", () => {
    const { notFound } = RESPONSE_MESSAGES.message;
    const translated = RESPONSE_MESSAGE_TRANSLATIONS.uk.message!.notFound!;

    it("keeps the default locale text", () => {
        expect(translateMessage({ text: notFound, locale: "en" })).toBe(
            notFound
        );
    });

    it("translates a known message", () => {
        expect(translateMessage({ text: notFound, locale: "uk" })).toBe(
            translated
        );
    });

    it("translates a message inside a composed string", () => {
        expect(
            translateMessage({ text: `body/ ${notFound}`, locale: "uk" })
        ).toBe(`body/ ${translated}`);
    });

    it("leaves unknown text untouched", () => {
        expect(translateMessage({ text: "Unknown", locale: "uk" })).toBe(
            "Unknown"
        );
    });
});
