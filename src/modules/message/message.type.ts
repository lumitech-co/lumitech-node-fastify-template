import type {
    CreateMessageJobData,
    UpdateMessageJobData,
} from "./message.schema.js";

type Message = {
    id: string;
    text: string;
    meta: PrismaJson.MessageMeta | null;
    createdAt: Date;
};

export type MessageId = Pick<Message, "id">;

export type MessageWrite = {
    id: string;
    text: string;
    meta?: PrismaJson.MessageMeta | null | undefined;
    updatedAt: Date;
};

export type MessageUpdate = Omit<MessageWrite, "text"> & {
    text?: string | undefined;
};

export type MessagePage = {
    cursor?: string | undefined;
    limit: number;
};

export type MessagePageResult = {
    messages: Message[];
    nextCursor: string | null;
};

export type CreateMessagePayload = CreateMessageJobData & {
    enqueuedAt: Date;
};

export type UpdateMessagePayload = UpdateMessageJobData & {
    enqueuedAt: Date;
};

export type DiffObjectsPayload<
    T extends Record<string, unknown>,
    K extends Record<string, unknown>,
> = {
    oldObj: T;
    newObj: K;
};
