import type { MessageJobName } from "./message.constant.js";
import type {
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
    id: string;
    payload: UpdateMessageInput;
};

export type EnqueueDeleteMessagePayload = {
    id: string;
};

export type MessageJobData =
    | CreateMessageJobData
    | UpdateMessageJobData
    | DeleteMessageJobData;

export type MessageJobResult = {
    id: string;
};

export type ProcessMessageJobPayload = {
    name: MessageJobName;
    data: MessageJobData;
    enqueuedAt: Date;
};
