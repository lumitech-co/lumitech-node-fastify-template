import path from "path";
import autoload from "@fastify/autoload";
import Fastify, { FastifyInstance } from "fastify";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { resolveTrustProxy } from "@/lib/proxy/proxy.util.js";
import { ENV_TO_LOGGER, GCP_LOGGER } from "@/lib/constants/logger.constant.js";
import { QUEUE_WORKER_PLUGIN_PATTERN } from "@/lib/constants/bullmq.constant.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type ConfigureServerOptions = {
    registerRoutes?: boolean;
    runQueueWorker?: boolean;
};

export const configureServer = async ({
    registerRoutes = true,
    runQueueWorker = true,
}: ConfigureServerOptions = {}): Promise<FastifyInstance> => {
    const fastify = Fastify({
        trustProxy: resolveTrustProxy(process.env.TRUSTED_PROXY_HOPS),
        logger:
            ENV_TO_LOGGER[
                process.env.NODE_ENV as "development" | "production" | "test"
            ] ?? GCP_LOGGER,
    });

    try {
        await fastify.register(autoload, {
            dir: path.join(__dirname, "plugins"),
            forceESM: true,
            ...(runQueueWorker
                ? {}
                : { ignoreFilter: QUEUE_WORKER_PLUGIN_PATTERN }),
        });

        await fastify.register(autoload, {
            dir: path.join(
                __dirname,
                registerRoutes ? "modules" : "modules/application"
            ),
            dirNameRoutePrefix: false,
            forceESM: true,

            maxDepth: 1,
            matchFilter: /\/index\.(ts|js)$/,
        });

        fastify.addHook("onClose", async () => {
            // Close all active connections here or directly inside the plugin.
        });

        await fastify.ready();
    } catch (err) {
        fastify.log.fatal(err, "failed to configure server");

        process.exit(1);
    }

    return fastify;
};
