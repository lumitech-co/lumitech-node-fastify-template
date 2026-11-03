import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { redactSecretQuery } from "@/lib/http/http.util.js";
import { URL_QUERY_SEPARATOR } from "@/lib/ipBan/ipBan.constant.js";
import {
    REQUEST_TIMEOUT_MS,
    REQUEST_TIMEOUT_RESPONSE,
    REQUEST_TIMEOUT_STATUS_CODE,
    UNTIMED_ROUTES,
} from "@/lib/constants/requestTimeout.constant.js";

/**
 * Answers 503 to a request that has not started responding after
 * REQUEST_TIMEOUT_MS. A stream that already sent its headers is left alone.
 */
const configureRequestTimeout = async (
    fastify: FastifyInstance
): Promise<void> => {
    fastify.addHook("onRequest", (request, reply, done) => {
        const url = request.raw.url ?? "";
        const [pathname = ""] = url.split(URL_QUERY_SEPARATOR);

        if (
            request.headers.upgrade ||
            UNTIMED_ROUTES.some((pattern) => pattern.test(pathname))
        ) {
            done();

            return;
        }

        const timer = setTimeout(() => {
            if (!reply.sent && !reply.raw.headersSent) {
                request.log.warn(
                    { url: redactSecretQuery(url), method: request.method },
                    "Request exceeded the timeout, answering 503"
                );

                void reply
                    .status(REQUEST_TIMEOUT_STATUS_CODE)
                    .send(REQUEST_TIMEOUT_RESPONSE);
            }
        }, REQUEST_TIMEOUT_MS);

        const clear = (): void => {
            clearTimeout(timer);
        };

        reply.raw.on("finish", clear);
        reply.raw.on("close", clear);

        done();
    });
};

export default fp(configureRequestTimeout, {});
