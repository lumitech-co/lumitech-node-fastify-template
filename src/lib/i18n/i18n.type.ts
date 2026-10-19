import type { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./i18n.constant.js";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type TranslatedLocale = Exclude<Locale, typeof DEFAULT_LOCALE>;

export type TranslateMessagePayload = {
    text: string;
    locale: Locale;
};
