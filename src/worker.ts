/// <reference types="./types/index.d.ts" />
import closeWithGrace from "close-with-grace";
import { configureServer } from "./server.js";

/**
 * Deploy as its own always-warm service (min-instances >= 1), never scale-to-zero.
 * Why: README.md, "Background Worker (BullMQ)".
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
