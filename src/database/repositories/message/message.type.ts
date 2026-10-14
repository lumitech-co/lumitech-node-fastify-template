import { Prisma } from "@prisma/client";
import type { messageListSelect } from "./message.repository.js";

export type MessageWrite = {
    id: string;
    text: string;
    meta?: PrismaJson.MessageMeta | null;
    updatedAt: Date;
};

export type MessageUpdate = Omit<MessageWrite, "text"> & {
    text?: string;
};

export type MessagePage = {
    cursor?: string;
    limit: number;
};

export type MessageListItem = Prisma.MessageGetPayload<{
    select: typeof messageListSelect;
}>;

export type MessagePageResult = {
    messages: MessageListItem[];
    nextCursor: string | null;
};
