/**
 * Single source of truth for every message returned to the client.
 * Grouped by module.
 */
export const RESPONSE_MESSAGES = {
    message: {
        created: "Message created successfully.",
        fetched: "Messages fetched successfully.",
        notFound: "Message not found.",
    },
} as const;
