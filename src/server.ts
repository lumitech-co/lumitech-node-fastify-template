import path from "path";
import autoload from "@fastify/autoload";
import Fastify, { FastifyInstance } from "fastify";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envToLogger = {
    development: {
        transport: {
            target: "pino-pretty",
            options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
            },
        },
    },
    production: true,
    test: {
        transport: {
            target: "pino-pretty",
            options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
            },
        },
        level: "fatal",
    },
};

export const configureServer = async (): Promise<FastifyInstance> => {
    const fastify = Fastify({
        logger:
            envToLogger[
                process.env.NODE_ENV as "development" | "production" | "test"
            ] ?? true,
    });

    try {
        await fastify.register(autoload, {
            dir: path.join(__dirname, "plugins"),
            forceESM: true,
        });

        await fastify.register(autoload, {
            dir: path.join(__dirname, "modules"),
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
