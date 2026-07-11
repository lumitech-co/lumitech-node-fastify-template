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
    }),
});

type FetchMessagesResponse = z.infer<typeof fetchMessagesResponseSchema>;

export {
    messageMetaSchema,
    createMessageBodySchema,
    createMessageResponseSchema,
    fetchMessagesResponseSchema,
};

export type {
    CreateMessageInput,
    CreateMessageResponse,
    FetchMessagesResponse,
};
