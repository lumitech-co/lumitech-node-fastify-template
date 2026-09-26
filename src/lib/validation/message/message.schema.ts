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

const updateMessageBodySchema = z
    .object({
        text: z.string(),
        meta: messageMetaSchema,
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: "At least one field must be provided.",
    });

type UpdateMessageInput = z.infer<typeof updateMessageBodySchema>;

const messageIdParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

type MessageIdParam = z.infer<typeof messageIdParamSchema>;

const createMessageJobSchema = createMessageBodySchema;

type CreateMessageJobData = z.infer<typeof createMessageJobSchema>;

const updateMessageJobSchema = z.object({
    id: z.number().int().positive(),
    text: z.string().optional(),
    meta: messageMetaSchema.optional(),
});

type UpdateMessageJobData = z.infer<typeof updateMessageJobSchema>;

const deleteMessageJobSchema = z.object({
    id: z.number().int().positive(),
});

type DeleteMessageJobData = z.infer<typeof deleteMessageJobSchema>;

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

const enqueueMessageResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        jobId: z.string(),
    }),
});

type EnqueueMessageResponse = z.infer<typeof enqueueMessageResponseSchema>;

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
    updateMessageBodySchema,
    messageIdParamSchema,
    createMessageJobSchema,
    updateMessageJobSchema,
    deleteMessageJobSchema,
    fetchMessagesQuerySchema,
    enqueueMessageResponseSchema,
    fetchMessagesResponseSchema,
};

export type {
    CreateMessageInput,
    UpdateMessageInput,
    MessageIdParam,
    CreateMessageJobData,
    UpdateMessageJobData,
    DeleteMessageJobData,
    FetchMessagesQuery,
    EnqueueMessageResponse,
    FetchMessagesResponse,
};
