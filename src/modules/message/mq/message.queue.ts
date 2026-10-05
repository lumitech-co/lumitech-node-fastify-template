import { Queue } from "bullmq";
import type { FastifyInstance } from "fastify";
import type { MessageJobData } from "./message.type.js";
import type { MessageJobName } from "./message.constant.js";
import {
    MESSAGE_QUEUE_NAME,
    MESSAGE_QUEUE_DEFAULT_JOB_OPTIONS,
} from "./message.constant.js";

export const configureMessageQueue = async (fastify: FastifyInstance) => {
    const messageQueue = new Queue<MessageJobData, unknown, MessageJobName>(
        MESSAGE_QUEUE_NAME,
        {
            connection: fastify.bullmqProducerConnection,
            defaultJobOptions: MESSAGE_QUEUE_DEFAULT_JOB_OPTIONS,
        }
    );

    messageQueue.on("error", (error) => {
        fastify.log.error({ error }, "Message queue error");
    });

    fastify.decorate("messageQueue", messageQueue);

    fastify.addHook("onClose", async (fastify) => {
        await fastify.messageQueue.close();
    });
};
