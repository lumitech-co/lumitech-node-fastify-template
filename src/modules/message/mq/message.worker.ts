import { ZodError } from "zod";
import type { FastifyInstance } from "fastify";
import { dayjs } from "@/lib/dayjs/dayjs.util.js";
import { UnrecoverableError, Worker } from "bullmq";
import { MESSAGE_QUEUE_NAME } from "./message.constant.js";
import type { MessageJobName } from "./message.constant.js";
import { summarizeJobData } from "@/lib/bullmq/bullmq.util.js";
import { BadRequestError, NotFoundError } from "@/lib/errors/errors.js";
import type { MessageJobData, MessageJobResult } from "./message.type.js";
import { WORKER_STALL_DEFAULTS } from "@/lib/constants/bullmq.constant.js";

export const configureMessageWorker = async (
    fastify: FastifyInstance
): Promise<void> => {
    const messageJobService = fastify.di.resolve("messageJobService");

    const worker = new Worker<MessageJobData, MessageJobResult, MessageJobName>(
        MESSAGE_QUEUE_NAME,
        (job) =>
            messageJobService
                .processMessageJob({
                    name: job.name,
                    data: job.data,
                    enqueuedAt: dayjs(job.timestamp).toDate(),
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
        { connection: fastify.bullmqConnection, ...WORKER_STALL_DEFAULTS }
    );

    worker.on("error", (error) => {
        fastify.log.error({ err: error }, "Message worker error");
    });

    worker.on("failed", (job, error) => {
        fastify.log.error(
            {
                err: error,
                jobId: job?.id,
                jobName: job?.name,
                data: summarizeJobData(job?.data),
            },
            "Message job failed"
        );
    });

    fastify.addHook("onClose", async () => {
        await worker.close();
    });
};
