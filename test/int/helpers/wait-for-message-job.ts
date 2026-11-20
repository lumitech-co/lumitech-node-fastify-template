import { QueueEvents } from "bullmq";
import type { FastifyInstance } from "fastify";

const DEFAULT_TIMEOUT_MS = 15000;

type WaitForMessageJobArgs = {
    server: FastifyInstance;
    jobId: string;
    timeoutMs?: number;
};

/** Event stream, not `Job.fromId` polling: a finished job is removed at once. */
export const waitForMessageJob = async ({
    server,
    jobId,
    timeoutMs = DEFAULT_TIMEOUT_MS,
}: WaitForMessageJobArgs): Promise<void> => {
    const queueEvents = new QueueEvents(server.messageQueue.name, {
        connection: server.bullmqConnection.duplicate(),
        lastEventId: "0",
    });

    await queueEvents.waitUntilReady();

    try {
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`Timed out waiting for message job ${jobId}`));
            }, timeoutMs);

            const cleanup = () => {
                clearTimeout(timer);
                queueEvents.off("completed", onCompleted);
                queueEvents.off("failed", onFailed);
            };

            const onCompleted = ({ jobId: completedId }: { jobId: string }) => {
                if (completedId !== jobId) {
                    return;
                }

                cleanup();
                resolve();
            };

            const onFailed = ({
                jobId: failedId,
                failedReason,
            }: {
                jobId: string;
                failedReason: string;
            }) => {
                if (failedId !== jobId) {
                    return;
                }

                cleanup();

                reject(
                    new Error(`Message job ${jobId} failed: ${failedReason}`)
                );
            };

            queueEvents.on("completed", onCompleted);
            queueEvents.on("failed", onFailed);
        });
    } finally {
        await queueEvents.close();
    }
};
