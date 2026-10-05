import { ZodError } from "zod";
import { FastifyInstance } from "fastify";
import { UnrecoverableError, Worker } from "bullmq";
import { MessageJobData, MessageJobResult } from "./message.type.js";
import { BadRequestError, NotFoundError } from "@/lib/errors/errors.js";
import { MESSAGE_QUEUE_NAME, MessageJobName } from "./message.constant.js";

export const configureMessageWorker = async (fastify: FastifyInstance) => {
    const messageJobService = fastify.di.resolve("messageJobService");

    const worker = new Worker<MessageJobData, MessageJobResult, MessageJobName>(
        MESSAGE_QUEUE_NAME,
        (job) =>
            messageJobService
                .processMessageJob({
                    name: job.name,
                    data: job.data,
                    enqueuedAt: new Date(job.timestamp),
                })
                .catch((error) => {
                    if (
                        error instanceof ZodError ||
                        error instanceof NotFoundError ||
                        error instanceof BadRequestError
                    ) {
                        throw new UnrecoverableError(error.message);
                    }

                    throw error;
                }),
        { connection: fastify.bullmqConnection }
    );

    worker.on("error", (error) => {
        fastify.log.error({ error }, "Message worker error");
    });

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
