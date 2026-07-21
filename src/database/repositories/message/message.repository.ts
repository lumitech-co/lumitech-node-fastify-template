import { eq } from "drizzle-orm";
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

export type MessageRepository = BaseRepository<typeof messages> & {
    findByIdOrFail: (args: FindMessageByIdOrFailArgs) => Promise<Message>;
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
    };
};

addDIResolverName(createMessageRepository, "messageRepository");
