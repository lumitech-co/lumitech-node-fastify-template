import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/lib/errors/errors.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { generateRepository } from "../generate.repository.js";
import { FindUniqueOrFail } from "@/database/prisma/prisma.type.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import { BaseRepository } from "@/database/repositories/repository.type.js";

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

        /**
         * Asks Postgres for the same `uuidv7()` the column defaults to, so a
         * create job can carry its id before the row exists.
         */
        generateId: async () => {
            const [{ id }] = await prisma.$queryRaw<
                [{ id: string }]
            >`SELECT uuidv7()::text AS id`;

            return id;
        },
    };
};

addDIResolverName(createMessageRepository, "messageRepository");
