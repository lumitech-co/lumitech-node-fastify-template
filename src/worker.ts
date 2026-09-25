/// <reference types="./types/index.d.ts" />
import closeWithGrace from "close-with-grace";
import { configureServer } from "./server.js";

/**
 * Deploy this entrypoint as its own always-warm service (e.g. Cloud Run with
 * min-instances >= 1). BullMQ's Worker needs a continuously running process
 * to pick up jobs — a scale-to-zero HTTP service only gets CPU while handling
 * a request, so a job enqueued while it is idle would otherwise sit unpicked
 * until unrelated traffic happens to wake it back up.
 */
const main = async () => {
    const fastify = await configureServer({
        registerRoutes: false,
        runQueueWorker: true,
    });

    const address = await fastify.listen({
        port: fastify.config.PORT,
        host: fastify.config.HOST,
    });

    fastify.log.info(`Worker listening at ${address}`);

    closeWithGrace(
        {
            delay: 500,
            logger: fastify.log,
        },
        async function ({ err, signal }) {
            if (err) {
                fastify.log.error(err, "worker failed with an error");
            }

            fastify.log.info("worker is closing: %s", signal);

            await fastify.close();
        }
    );
};

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);

    process.exit(1);
});
