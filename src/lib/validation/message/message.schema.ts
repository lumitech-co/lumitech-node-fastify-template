import { z } from "zod";

const messageMetaSchema = z.object({
    source: z.enum(["web", "mobile", "api"]),
    locale: z.string().optional(),
    tags: z.array(z.string()).optional(),
    attachments: z
        .array(
            z.object({
                url: z.url(),
                mimeType: z.string(),
                sizeBytes: z.number().int().nonnegative(),
            })
        )
        .optional(),
});

const defaultMessageSchema = z.object({
    id: z.number(),
    text: z.string(),
    createdAt: z.date(),
    meta: messageMetaSchema.nullable(),
});

const createMessageBodySchema = z.object({
    text: z.string(),
    meta: messageMetaSchema.optional(),
});

type CreateMessageInput = z.infer<typeof createMessageBodySchema>;

const MESSAGES_PAGE_DEFAULT_LIMIT = 20;
const MESSAGES_PAGE_MAX_LIMIT = 100;

const fetchMessagesQuerySchema = z.object({
    cursor: z.coerce.number().int().positive().optional(),
    limit: z.coerce
        .number()
        .int()
        .positive()
        .max(MESSAGES_PAGE_MAX_LIMIT)
        .default(MESSAGES_PAGE_DEFAULT_LIMIT),
});

type FetchMessagesQuery = z.infer<typeof fetchMessagesQuerySchema>;

const createMessageResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        message: defaultMessageSchema,
    }),
});

type CreateMessageResponse = z.infer<typeof createMessageResponseSchema>;

const fetchMessagesResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        messages: z.array(defaultMessageSchema),
        nextCursor: z.number().nullable(),
    }),
});

type FetchMessagesResponse = z.infer<typeof fetchMessagesResponseSchema>;

export {
    messageMetaSchema,
    createMessageBodySchema,
    fetchMessagesQuerySchema,
    createMessageResponseSchema,
    fetchMessagesResponseSchema,
};

export type {
    CreateMessageInput,
    FetchMessagesQuery,
    CreateMessageResponse,
    FetchMessagesResponse,
};
