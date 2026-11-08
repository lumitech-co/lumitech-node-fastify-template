import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import {
    INTERNAL_SERVER_ERROR_RESPONSE,
    INTERNAL_SERVER_ERROR_STATUS_CODE,
} from "@/lib/constants/error.constant.js";

const configureErrorHandler = async (fastify: FastifyInstance) => {
    fastify.setErrorHandler((error, request, reply) => {
        if (!(error instanceof Error) || !("statusCode" in error)) {
            request.log.error({ err: error }, "Unhandled error");

            // A plain object, not an Error: an Error reply logs the stack twice.
            return reply
                .status(INTERNAL_SERVER_ERROR_STATUS_CODE)
                .send(INTERNAL_SERVER_ERROR_RESPONSE);
        }

        return reply.send(error);
    });
};

export default fp(configureErrorHandler, {});
