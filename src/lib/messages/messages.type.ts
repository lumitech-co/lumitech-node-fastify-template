import type { RESPONSE_MESSAGES } from "./messages.constant.js";
import type { TranslatedLocale } from "@/lib/i18n/i18n.type.js";

type ResponseMessages = typeof RESPONSE_MESSAGES;

export type ResponseMessageTranslations = Record<
    TranslatedLocale,
    {
        [Group in keyof ResponseMessages]?: Partial<
            Record<keyof ResponseMessages[Group], string>
        >;
    }
>;
