import { MessageJobName } from "./message.constant.js";
import {
    CreateMessageInput,
    UpdateMessageInput,
    CreateMessageJobData,
    UpdateMessageJobData,
    DeleteMessageJobData,
} from "@/lib/validation/message/message.schema.js";

export type EnqueueCreateMessagePayload = {
    payload: CreateMessageInput;
};

export type EnqueueUpdateMessagePayload = {
    id: number;
    payload: UpdateMessageInput;
};

export type EnqueueDeleteMessagePayload = {
    id: number;
};

export type MessageJobData =
    | CreateMessageJobData
    | UpdateMessageJobData
    | DeleteMessageJobData;

export type MessageJobResult = {
    id: number;
};

export type ProcessMessageJobPayload = {
    name: MessageJobName;
    data: MessageJobData;
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
