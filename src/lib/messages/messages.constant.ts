/**
 * Single source of truth for every message returned to the client.
 * Grouped by module.
 */
export const RESPONSE_MESSAGES = {
    message: {
        createQueued: "Message creation has been queued.",
        updateQueued: "Message update has been queued.",
        deleteQueued: "Message deletion has been queued.",
        fetched: "Messages fetched successfully.",
        notFound: "Message not found.",
        unknownJobName: "Unknown message job name",
    },
} as const;
