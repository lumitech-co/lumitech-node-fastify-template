import { toMetaInput } from "./message.util.js";
import { NotFoundError } from "@/lib/errors/errors.js";
import type { Prisma, PrismaClient } from "@prisma/client";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import type {
    MessageId,
    MessagePage,
    MessageWrite,
    MessageUpdate,
    MessagePageResult,
} from "./message.type.js";

const messageSelect = {
    id: true,
    createdAt: true,
    text: true,
    meta: true,
} satisfies Prisma.MessageSelect;

const messageIdSelect = {
    id: true,
} satisfies Prisma.MessageSelect;

export type MessageRepository = {
    generateId: () => Promise<string>;
    assertExists: (message: MessageId) => Promise<void>;
    createIfAbsent: (data: MessageWrite) => Promise<void>;
    updateIfNotNewer: (data: MessageUpdate) => Promise<boolean>;
    deleteById: (message: MessageId) => Promise<void>;
    findPage: (page: MessagePage) => Promise<MessagePageResult>;
};

export const createMessageRepository = (
    prisma: PrismaClient
): MessageRepository => ({
    generateId: async () => {
        const [{ id }] = await prisma.$queryRaw<
            [{ id: string }]
        >`SELECT uuidv7()::text AS id`;

        return id;
    },

    assertExists: async ({ id }) => {
        const message = await prisma.message.findUnique({
            where: { id },
            select: messageIdSelect,
        });

        if (!message) {
            throw new NotFoundError(RESPONSE_MESSAGES.message.notFound);
        }
    },

    createIfAbsent: async ({ id, meta, ...data }) => {
        await prisma.message.upsert({
            where: { id },
            create: { id, meta: toMetaInput(meta), ...data },
            update: {},
            select: messageIdSelect,
        });
    },

    updateIfNotNewer: async ({ id, meta, ...data }) => {
        const { count } = await prisma.message.updateMany({
            where: { id, updatedAt: { lte: data.updatedAt } },
            data: { meta: toMetaInput(meta), ...data },
        });

        if (count > 0) {
            return true;
        }

        const message = await prisma.message.findUnique({
            where: { id },
            select: messageIdSelect,
        });

        if (!message) {
            throw new NotFoundError(RESPONSE_MESSAGES.message.notFound);
        }

        return false;
    },

    deleteById: async ({ id }) => {
        await prisma.message.deleteMany({ where: { id } });
    },

    findPage: async ({ cursor, limit }) => {
        const messages = await prisma.message.findMany({
            take: limit,
            orderBy: { id: "desc" },
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            select: messageSelect,
        });

        const nextCursor =
            messages.length === limit ? (messages.at(-1)?.id ?? null) : null;

        return { messages, nextCursor };
    },
});

addDIResolverName(createMessageRepository, "messageRepository");
