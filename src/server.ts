import path from "path";
import autoload from "@fastify/autoload";
import Fastify, { FastifyInstance } from "fastify";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// GCP Cloud Logging reads a string `severity` field; Pino emits a numeric
// `level`, so without this mapping every entry shows up as INFO.
// https://github.com/pinojs/pino/blob/main/docs/help.md#mapping-pino-log-levels-to-google-cloud-logging-stackdriver-severity-levels
const pinoLevelToGcpSeverity: Record<string, string> = {
    trace: "DEBUG",
    debug: "DEBUG",
    info: "INFO",
    warn: "WARNING",
    error: "ERROR",
    fatal: "CRITICAL",
};

const gcpLogger = {
    messageKey: "message",
    formatters: {
        level(label: string, number: number) {
            return {
                severity: pinoLevelToGcpSeverity[label] ?? "INFO",
                level: number,
            };
        },
    },
};

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
    production: gcpLogger,
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
            ] ?? gcpLogger,
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
