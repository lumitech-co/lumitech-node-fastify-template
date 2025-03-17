/// <reference types="./types/index.d.ts" />
import { configureServer } from "./server";

const main = async () => {
    const fastify = await configureServer();

    const address = await fastify.listen({
        port: fastify.config.PORT,
        host: fastify.config.HOST,
    });

    fastify.log.info(`Documentation available at ${address}/api/docs/`);

    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

    signals.forEach((signal) => {
        process.on(signal, async () => {
            fastify.log.info(`Received ${signal}, closing server`);

            await fastify.close();
            process.exit(0);
        });
    });
};

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);

    process.exit(1);
});
