// GCP Cloud Logging reads a string `severity` field; Pino emits a numeric
// `level`, so without this mapping every entry shows up as INFO.
// https://github.com/pinojs/pino/blob/main/docs/help.md#mapping-pino-log-levels-to-google-cloud-logging-stackdriver-severity-levels
const PINO_LEVEL_TO_GCP_SEVERITY: Record<string, string> = {
    trace: "DEBUG",
    debug: "DEBUG",
    info: "INFO",
    warn: "WARNING",
    error: "ERROR",
    fatal: "CRITICAL",
};

export const GCP_LOGGER = {
    messageKey: "message",
    formatters: {
        level(label: string, number: number) {
            return {
                severity: PINO_LEVEL_TO_GCP_SEVERITY[label] ?? "INFO",
                level: number,
            };
        },
    },
};

export const ENV_TO_LOGGER = {
    development: {
        transport: {
            target: "pino-pretty",
            options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
            },
        },
    },
    production: GCP_LOGGER,
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
