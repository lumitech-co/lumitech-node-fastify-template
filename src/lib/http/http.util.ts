import type { FastifyRequest } from "fastify";
import type { RequestLogEntry } from "./http.type.js";
import { REDACTED_VALUE, SECRET_QUERY_PARAM } from "./http.constant.js";

export const redactSecretQuery = (url: string): string =>
    url.replace(SECRET_QUERY_PARAM, `$1${REDACTED_VALUE}`);

/**
 * Fastify's default request log serializer with credential query parameters
 * blanked — the default logs every request URL verbatim.
 */
export const serializeRequestForLog = (
    request: FastifyRequest
): RequestLogEntry => ({
    method: request.method,
    url: redactSecretQuery(request.url),
    host: request.host,
    remoteAddress: request.ip,
    ...(request.socket.remotePort !== undefined && {
        remotePort: request.socket.remotePort,
    }),
});
