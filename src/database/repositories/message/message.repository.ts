import { desc, eq, lt } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors/errors.js";
import { messages } from "@/database/drizzle/schema.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { generateRepository } from "../generate.repository.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import { Database, Transaction } from "@/database/drizzle/drizzle.type.js";
import {
    BaseRepository,
    Entity,
} from "@/database/repositories/repository.type.js";

export type Message = Entity<typeof messages>;

export type FindMessageByIdOrFailArgs = {
    id: number;
    tx?: Transaction;
};

export type FindMessagePageArgs = {
    cursor?: number;
    limit: number;
    tx?: Transaction;
};

export type MessagePage = {
    items: Message[];
    nextCursor: number | null;
};

export type MessageRepository = BaseRepository<typeof messages> & {
    findByIdOrFail: (args: FindMessageByIdOrFailArgs) => Promise<Message>;
    findPage: (args: FindMessagePageArgs) => Promise<MessagePage>;
};

export const createMessageRepository = (db: Database): MessageRepository => {
    const repository = generateRepository(db, messages);

    return {
        ...repository,
        findByIdOrFail: async ({ id, tx }) => {
            const message = await repository.findFirst({
                where: eq(messages.id, id),
                tx,
            });

            if (!message) {
                throw new NotFoundError(RESPONSE_MESSAGES.message.notFound);
            }

            return message;
        },
        findPage: async ({ cursor, limit, tx }) => {
            const rows = await repository.findMany({
                where:
                    cursor === undefined ? undefined : lt(messages.id, cursor),
                orderBy: desc(messages.id),
                limit: limit + 1,
                tx,
            });

            const hasMore = rows.length > limit;
            const items = hasMore ? rows.slice(0, limit) : rows;
            const nextCursor = hasMore ? items[items.length - 1].id : null;

            return { items, nextCursor };
        },
    };
};

addDIResolverName(createMessageRepository, "messageRepository");
