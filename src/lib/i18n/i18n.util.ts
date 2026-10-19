import type { Locale, TranslateMessagePayload } from "./i18n.type.js";
import {
    DEFAULT_LOCALE,
    QUALITY_PARAM_PREFIX,
    SUPPORTED_LOCALES,
} from "./i18n.constant.js";
import {
    RESPONSE_MESSAGES,
    RESPONSE_MESSAGE_TRANSLATIONS,
} from "@/lib/messages/messages.constant.js";

/**
 * Picks the best supported locale from an Accept-Language header by q-weight,
 * matching on the primary subtag ("uk-UA" → "uk").
 */
export const resolveLocale = (acceptLanguage: string | undefined): Locale =>
    (acceptLanguage ?? "")
        .split(",")
        .map((range) => {
            const [tag = "", ...params] = range.trim().split(";");

            const [language = ""] = tag.split("-");

            const weight = params
                .map((param) => param.trim())
                .find((param) => param.startsWith(QUALITY_PARAM_PREFIX));

            return {
                language: language.toLowerCase(),
                quality: weight
                    ? Number(weight.slice(QUALITY_PARAM_PREFIX.length))
                    : 1,
            };
        })
        .filter(({ quality }) => quality > 0)
        .sort((left, right) => right.quality - left.quality)
        .map(({ language }) =>
            SUPPORTED_LOCALES.find((locale) => locale === language)
        )
        .find(Boolean) ?? DEFAULT_LOCALE;

/**
 * Replaces every RESPONSE_MESSAGES text found in `text` with its translation,
 * so composed strings (validation errors) are translated too. A missing
 * translation falls back to the default-locale text.
 */
export const translateMessage = ({
    text,
    locale,
}: TranslateMessagePayload): string => {
    if (locale === DEFAULT_LOCALE) {
        return text;
    }

    const translations: Partial<
        Record<string, Partial<Record<string, string>>>
    > = RESPONSE_MESSAGE_TRANSLATIONS[locale];

    return Object.entries(RESPONSE_MESSAGES).reduce(
        (result, [group, messages]) =>
            Object.entries(messages).reduce((translated, [key, original]) => {
                const translation = translations[group]?.[key];

                return translation
                    ? translated.replaceAll(original, translation)
                    : translated;
            }, result),
        text
    );
};
