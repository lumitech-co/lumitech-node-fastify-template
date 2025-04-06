import { Message } from "@prisma/client";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreateMessageInput } from "@/lib/validation/message/message.schema.js";
import {
    messageService,
    mockMessageRepository,
} from "./mock/message-service.mock.js";

beforeEach(() => {
    vi.resetAllMocks();
});

describe("message.service - createMessage", () => {
    it("should create a message successfully", async () => {
        const payload: CreateMessageInput = {
            text: "Hello, world!",
        };

        const createdMessage = {
            id: 1,
            createdAt: new Date(),
            text: "Hello, world!",
        } as Message;

        mockMessageRepository.create.mockResolvedValue(createdMessage);

        const result = await messageService.createMessage({ payload });

        expect(result.message).toBe("Message created successfully.");
        expect(result.data.message).toEqual(createdMessage);

        expect(mockMessageRepository.create).toHaveBeenCalledWith({
            data: { text: payload.text },
            select: expect.any(Object),
        });

        expect(mockMessageRepository.create).toHaveBeenCalledTimes(1);
    });

    it("should handle empty text correctly", async () => {
        const payload: CreateMessageInput = {
            text: "",
        };

        const createdMessage = {
            id: 1,
            createdAt: new Date(),
            text: "",
        } as Message;

        mockMessageRepository.create.mockResolvedValue(createdMessage);

        const result = await messageService.createMessage({ payload });

        expect(result.data.message).toEqual(createdMessage);

        expect(mockMessageRepository.create).toHaveBeenCalledWith({
            data: { text: "" },
            select: expect.any(Object),
        });
    });
});
