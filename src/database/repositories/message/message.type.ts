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

export type MessagePageResult = {
    messages: Message[];
    nextCursor: string | null;
};
