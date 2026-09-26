import { Queue } from "bullmq";
import { FastifyInstance } from "fastify";
import { MessageJobData } from "./message.type.js";
import {
    MessageJobName,
    MESSAGE_QUEUE_NAME,
    MESSAGE_QUEUE_DEFAULT_JOB_OPTIONS,
} from "./message.constant.js";

export const configureMessageQueue = async (fastify: FastifyInstance) => {
    const messageQueue = new Queue<MessageJobData, unknown, MessageJobName>(
        MESSAGE_QUEUE_NAME,
        {
            connection: fastify.bullmqConnection,
            defaultJobOptions: MESSAGE_QUEUE_DEFAULT_JOB_OPTIONS,
        }
    );

    fastify.decorate("messageQueue", messageQueue);

    fastify.addHook("onClose", async (fastify) => {
        await fastify.messageQueue.close();
    });
};
