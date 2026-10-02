import { FastifyInstance } from "fastify";
import { configureServer } from "@/server.js";
import { setTimeout } from "node:timers/promises";
import { beforeEach, describe, expect, it } from "vitest";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import { waitForMessageJob } from "../../helpers/wait-for-message-job.js";
import {
    MessageJobName,
    MESSAGE_QUEUE_NAME,
} from "@/modules/message/mq/message.constant.js";

const MISSING_ID = "019a0000-0000-7000-8000-0000000000f1";

const UNPROCESSED_WAIT_MS = 500;

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

    it("should fail a job for a missing message once, without retries", async () => {
        const job = await server.messageQueue.add(MessageJobName.Update, {
            id: MISSING_ID,
            text: "Never applied",
        });

        await expect(
            waitForMessageJob({ server, jobId: job.id ?? "" })
        ).rejects.toThrow(RESPONSE_MESSAGES.message.notFound);

        const failed = await server.messageQueue.getJob(job.id ?? "");

        expect(await failed?.getState()).toBe("failed");
        expect(failed?.attemptsMade).toBe(1);
    });

    it("should fail a job with invalid data once, without retries", async () => {
        const job = await server.messageQueue.add(MessageJobName.Create, {
            id: MISSING_ID,
        });

        await expect(
            waitForMessageJob({ server, jobId: job.id ?? "" })
        ).rejects.toThrow();

        const failed = await server.messageQueue.getJob(job.id ?? "");

        expect(failed?.attemptsMade).toBe(1);
        expect(
            await server.prisma.message.count({ where: { id: MISSING_ID } })
        ).toBe(0);
    });

    it("should answer 500 right away when the producer cannot reach Redis", async () => {
        server.bullmqProducerConnection.disconnect();

        const response = await server.inject({
            method: "POST",
            url: "/api/messages",
            body: { text: "Redis is down" },
        });

        expect(response.statusCode).toBe(500);
        expect(await server.prisma.message.count()).toBe(0);
    });
});

describe("API server without the queue worker", () => {
    let server: FastifyInstance;

    beforeEach(async () => {
        server = await configureServer({ runQueueWorker: false });

        return async () => {
            await server.close();
        };
    });

    it("should enqueue jobs but leave them unprocessed", async () => {
        const response = await server.inject({
            method: "POST",
            url: "/api/messages",
            body: { text: "Waits for the worker" },
        });

        expect(response.statusCode).toBe(202);

        await setTimeout(UNPROCESSED_WAIT_MS);

        const job = await server.messageQueue.getJob(
            response.json().data.jobId
        );

        expect(await job?.getState()).toBe("waiting");
        expect(await server.prisma.message.count()).toBe(0);
    });
});
