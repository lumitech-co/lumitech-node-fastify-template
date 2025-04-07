/// <reference types="./types/index.d.ts" />
import closeWithGrace from "close-with-grace";
import { configureServer } from "./server.js";

const main = async () => {
    const fastify = await configureServer();

    const address = await fastify.listen({
        port: fastify.config.PORT,
        host: fastify.config.HOST,
    });

    fastify.log.info(`Documentation available at ${address}/api/docs/`);

    closeWithGrace(
        {
            delay: 500,
            logger: fastify.log,
        },
        async function ({ err, signal }) {
            if (err) {
                fastify.log.error(err, "server failed with an error");
            }

            fastify.log.info("server is closing: %s", signal);

            await fastify.close();
        }
    );
};

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);

    process.exit(1);
});
