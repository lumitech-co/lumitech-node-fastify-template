import type { ResponseMessageTranslations } from "./messages.type.js";

/**
 * Single source of truth for every message returned to the client.
 * Grouped by module. Texts are in the default locale (DEFAULT_LOCALE).
 */
export const RESPONSE_MESSAGES = {
    message: {
        createQueued: "Message creation has been queued.",
        updateQueued: "Message update has been queued.",
        deleteQueued: "Message deletion has been queued.",
        fetched: "Messages fetched successfully.",
        notFound: "Message not found.",
        unknownJobName: "Unknown message job name",
        updateEmpty: "At least one field must be provided.",
    },
} as const;

/**
 * Translations of RESPONSE_MESSAGES, applied by the i18n plugin from the
 * request's Accept-Language. A missing entry falls back to the default text.
 */
export const RESPONSE_MESSAGE_TRANSLATIONS: ResponseMessageTranslations = {
    uk: {
        message: {
            createQueued: "Створення повідомлення поставлено в чергу.",
            updateQueued: "Оновлення повідомлення поставлено в чергу.",
            deleteQueued: "Видалення повідомлення поставлено в чергу.",
            fetched: "Повідомлення успішно отримано.",
            notFound: "Повідомлення не знайдено.",
            updateEmpty: "Потрібно вказати хоча б одне поле.",
        },
    },
};
