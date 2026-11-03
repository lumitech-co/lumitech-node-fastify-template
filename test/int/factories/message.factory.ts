import { randomUUID } from "node:crypto";
import type { Message, Prisma, PrismaClient } from "@prisma/client";

/** Takes no `id`: TRUNCATE restarts the sequences, so read it off the returned row. */
type CreateMessageArgs = {
    prisma: PrismaClient;
    overrides?: Partial<Prisma.MessageUncheckedCreateInput>;
};

type CreateMessagesArgs = CreateMessageArgs & {
    count: number;
};

export const createMessage = async ({
    prisma,
    overrides = {},
}: CreateMessageArgs): Promise<Message> =>
    prisma.message.create({
        data: {
            text: `message-${randomUUID()}`,
            ...overrides,
        },
    });

export const createMessages = async ({
    prisma,
    count,
    overrides = {},
}: CreateMessagesArgs): Promise<Message[]> =>
    prisma.message.createManyAndReturn({
        data: Array.from({ length: count }, () => ({
            text: `message-${randomUUID()}`,
            ...overrides,
        })),
    });
