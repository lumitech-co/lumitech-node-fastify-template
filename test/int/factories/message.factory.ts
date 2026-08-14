import { randomUUID } from "node:crypto";
import { Message, Prisma, PrismaClient } from "@prisma/client";

/**
 * Arrange factory: seeds a precondition directly through Prisma so a test can
 * start from a known state without depending on another test having run.
 *
 * Never accepts or assumes an `id`. The per-test TRUNCATE restarts identity
 * sequences, so a hardcoded id is only ever accidentally correct — read the id
 * back off the returned row instead.
 */
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
}: CreateMessageArgs): Promise<Message> => {
    return prisma.message.create({
        data: {
            text: `message-${randomUUID()}`,
            ...overrides,
        },
    });
};

export const createMessages = async ({
    prisma,
    count,
    overrides = {},
}: CreateMessagesArgs): Promise<Message[]> => {
    return prisma.message.createManyAndReturn({
        data: Array.from({ length: count }, () => ({
            text: `message-${randomUUID()}`,
            ...overrides,
        })),
    });
};
