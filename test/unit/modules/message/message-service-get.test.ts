import { Message } from "@prisma/client";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    messageService,
    mockLog,
    mockMessageRepository,
} from "./mock/message-service.mock.js";

beforeEach(() => {
    vi.resetAllMocks();
});

describe("message.service - getMessages", () => {
    it("should fetch messages successfully", async () => {
        const messages = [
            {
                id: 1,
                createdAt: new Date(),
                text: "Hello, world!",
                updatedAt: new Date(),
            },
            {
                id: 2,
                createdAt: new Date(),
                text: "Another message",
                updatedAt: new Date(),
            },
        ];

        mockMessageRepository.findMany.mockResolvedValue(messages as Message[]);

        const result = await messageService.getMessages();

        expect(result.message).toEqual(expect.any(String));
        expect(result.data.messages).toEqual(messages);
        expect(mockMessageRepository.findMany).toHaveBeenCalledTimes(1);

        expect(mockLog.info).toHaveBeenCalledWith(
            "Current environment: %s",
            "test"
        );
    });

    it("should return empty array when no messages exist", async () => {
        const emptyMessages: [] = [];

        mockMessageRepository.findMany.mockResolvedValue(emptyMessages);

        const result = await messageService.getMessages();

        expect(result.message).toEqual(expect.any(String));
        expect(result.data.messages).toEqual([]);
        expect(mockMessageRepository.findMany).toHaveBeenCalledTimes(1);

        expect(mockLog.info).toHaveBeenCalledWith(
            "Current environment: %s",
            "test"
        );
    });
});
