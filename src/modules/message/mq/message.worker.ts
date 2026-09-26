import { Worker } from "bullmq";
import { FastifyInstance } from "fastify";
import { MessageJobData, MessageJobResult } from "./message.type.js";
import { MESSAGE_QUEUE_NAME, MessageJobName } from "./message.constant.js";

export const configureMessageWorker = async (fastify: FastifyInstance) => {
    const messageJobService = fastify.di.resolve("messageJobService");

    const worker = new Worker<MessageJobData, MessageJobResult, MessageJobName>(
        MESSAGE_QUEUE_NAME,
        (job) =>
            messageJobService.processMessageJob({
                name: job.name,
                data: job.data,
            }),
        { connection: fastify.bullmqConnection }
    );

    worker.on("failed", (job, error) => {
        fastify.log.error(
            { error, jobId: job?.id, jobName: job?.name },
            "Message job failed"
        );
    });

    fastify.addHook("onClose", async () => {
        await worker.close();
    });
};
