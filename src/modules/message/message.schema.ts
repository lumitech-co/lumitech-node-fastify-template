import { z } from "zod";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";

const MESSAGE_TEXT_MAX_LENGTH = 5000;
const MESSAGE_LOCALE_MAX_LENGTH = 35;
const MESSAGE_TAGS_MAX_ITEMS = 20;
const MESSAGE_TAG_MAX_LENGTH = 50;
const MESSAGE_ATTACHMENTS_MAX_ITEMS = 10;
const MESSAGE_ATTACHMENT_URL_MAX_LENGTH = 2048;
const MESSAGE_MIME_TYPE_MAX_LENGTH = 255;

const messageTextSchema = z.string().max(MESSAGE_TEXT_MAX_LENGTH);

const messageMetaSchema = z.object({
    source: z.enum(["web", "mobile", "api"]),
    locale: z.string().max(MESSAGE_LOCALE_MAX_LENGTH).optional(),
    tags: z
        .array(z.string().max(MESSAGE_TAG_MAX_LENGTH))
        .max(MESSAGE_TAGS_MAX_ITEMS)
        .optional(),
    attachments: z
        .array(
            z.object({
                url: z.url().max(MESSAGE_ATTACHMENT_URL_MAX_LENGTH),
                mimeType: z.string().max(MESSAGE_MIME_TYPE_MAX_LENGTH),
                sizeBytes: z.number().int().nonnegative(),
            })
        )
        .max(MESSAGE_ATTACHMENTS_MAX_ITEMS)
        .optional(),
});

const defaultMessageSchema = z.object({
    id: z.uuidv7(),
    text: z.string(),
    createdAt: z.date(),
    meta: messageMetaSchema.nullable(),
});

const createMessageBodySchema = z.object({
    id: z.uuidv7().optional(),
    text: messageTextSchema,
    meta: messageMetaSchema.optional(),
});

type CreateMessageInput = z.infer<typeof createMessageBodySchema>;

const updateMessageBodySchema = z
    .object({
        text: messageTextSchema,
        meta: messageMetaSchema.nullable(),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
        message: RESPONSE_MESSAGES.message.updateEmpty,
    });

type UpdateMessageInput = z.infer<typeof updateMessageBodySchema>;

const messageIdParamSchema = z.object({
    id: z.uuidv7(),
});

type MessageIdParam = z.infer<typeof messageIdParamSchema>;

const createMessageJobSchema = createMessageBodySchema.extend({
    id: z.uuidv7(),
});

type CreateMessageJobData = z.infer<typeof createMessageJobSchema>;

const updateMessageJobSchema = z.object({
    id: z.uuidv7(),
    text: z.string().optional(),
    meta: messageMetaSchema.nullable().optional(),
});

type UpdateMessageJobData = z.infer<typeof updateMessageJobSchema>;

const deleteMessageJobSchema = z.object({
    id: z.uuidv7(),
});

type DeleteMessageJobData = z.infer<typeof deleteMessageJobSchema>;

const MESSAGES_PAGE_DEFAULT_LIMIT = 20;
const MESSAGES_PAGE_MAX_LIMIT = 100;

const fetchMessagesQuerySchema = z.object({
    cursor: z.uuidv7().optional(),
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
        id: z.uuidv7(),
        jobId: z.string(),
    }),
});

type EnqueueMessageResponse = z.infer<typeof enqueueMessageResponseSchema>;

const fetchMessagesResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        messages: z.array(defaultMessageSchema),
        nextCursor: z.uuidv7().nullable(),
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
