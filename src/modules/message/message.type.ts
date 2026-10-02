import {
    CreateMessageJobData,
    UpdateMessageJobData,
} from "@/lib/validation/message/message.schema.js";

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

export type IsEqualPayload = {
    a: unknown;
    b: unknown;
};
