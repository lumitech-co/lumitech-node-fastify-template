import path from "path";
import autoload from "@fastify/autoload";
import Fastify, { FastifyInstance } from "fastify";

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
    test: false,
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
        });

        await fastify.register(autoload, {
            dir: path.join(__dirname, "modules"),
            dirNameRoutePrefix: false,
        });

        fastify.addHook("onClose", async () => {
            // Close all active connections here or directly inside the plugin.
        });

        await fastify.ready();
    } catch (err) {
        fastify.log.error("Failed to configure server");
        fastify.log.error(err);

        process.exit(1);
    }

    return fastify;
};
