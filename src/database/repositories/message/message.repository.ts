import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/lib/errors/errors.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { PrismaAwaited } from "@/database/prisma/prisma.type.js";
import { BaseRepository, generateRepository } from "../generate.repository.js";

export type MessageRepository = BaseRepository<"message"> & {
    findUniqueOrFail: (
        payload: Prisma.MessageFindUniqueArgs
    ) => PrismaAwaited<PrismaClient["message"]["findUnique"]>;
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
                throw new NotFoundError("Message not found.");
            }

            return message;
        },
    };
};

addDIResolverName(createMessageRepository, "messageRepository");
