import { NotFoundError } from "@/lib/errors";
import { addDIResolverName } from "@/lib/awilix";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaAwaited } from "@/database/prisma/prisma.type";
import { BaseRepository, generateRepository } from "../generate.repository";

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
