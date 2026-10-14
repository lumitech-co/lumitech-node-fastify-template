import { toMetaInput } from "./message.util.js";
import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/lib/errors/errors.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { generateRepository } from "../generate.repository.js";
import { FindUniqueOrFail } from "@/database/prisma/prisma.type.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import { BaseRepository } from "@/database/repositories/repository.type.js";
import {
    MessagePage,
    MessageWrite,
    MessageUpdate,
    MessagePageResult,
} from "./message.type.js";

export const messageListSelect = {
    id: true,
    createdAt: true,
    text: true,
    meta: true,
} satisfies Prisma.MessageSelect;

export const messageIdSelect = {
    id: true,
} satisfies Prisma.MessageSelect;

export type MessageRepository = BaseRepository<"message"> & {
    findUniqueOrFail: FindUniqueOrFail<
        Prisma.MessageFindUniqueArgs,
        Prisma.$MessagePayload
    >;
    generateId: () => Promise<string>;
    createIfAbsent: (data: MessageWrite) => Promise<void>;
    updateIfNotNewer: (data: MessageUpdate) => Promise<boolean>;
    findPage: (page: MessagePage) => Promise<MessagePageResult>;
};

export const createMessageRepository = (
    prisma: PrismaClient
): MessageRepository => {
    const repository = generateRepository(prisma, "Message");

    return {
        ...repository,
        findUniqueOrFail: async (args) => {
            const message = await prisma.message.findUnique(args);

            if (!message) {
                throw new NotFoundError(RESPONSE_MESSAGES.message.notFound);
            }

            return message;
        },

        generateId: async () => {
            const [{ id }] = await prisma.$queryRaw<
                [{ id: string }]
            >`SELECT uuidv7()::text AS id`;

            return id;
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

        findPage: async ({ cursor, limit }) => {
            const messages = await prisma.message.findMany({
                take: limit,
                orderBy: { id: "desc" },
                ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
                select: messageListSelect,
            });

            const nextCursor =
                messages.length === limit
                    ? messages[messages.length - 1].id
                    : null;

            return { messages, nextCursor };
        },
    };
};

addDIResolverName(createMessageRepository, "messageRepository");
