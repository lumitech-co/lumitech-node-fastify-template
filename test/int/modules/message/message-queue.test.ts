import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { beforeEach, describe, expect, it } from "vitest";
import { MESSAGE_QUEUE_NAME } from "@/modules/message/mq/message.constant.js";

describe("messageQueue plugin", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer();

        return async () => {
            await server.close();
        };
    });

    it("should decorate the fastify instance with the message queue", () => {
        expect(server.messageQueue).toBeDefined();
        expect(server.messageQueue.name).toBe(MESSAGE_QUEUE_NAME);
    });

    it("should configure the default job options on the queue", () => {
        const defaultJobOptions = server.messageQueue.opts.defaultJobOptions;

        expect(defaultJobOptions?.attempts).toBe(3);
        expect(defaultJobOptions?.backoff).toEqual({
            type: "exponential",
            delay: 1000,
        });
        expect(defaultJobOptions?.removeOnComplete).toBe(true);
        expect(defaultJobOptions?.removeOnFail).toBe(100);
    });
});
