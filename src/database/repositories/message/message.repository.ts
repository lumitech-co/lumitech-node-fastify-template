import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/lib/errors/errors.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { FindUniqueOrFail } from "@/database/prisma/prisma.type.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import { BaseRepository } from "@/database/repositories/repository.type.js";
import { generateRepository } from "@/database/repositories/generate.repository.js";

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
    };
};

addDIResolverName(createMessageRepository, "messageRepository");
