import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import {
    INTERNAL_SERVER_ERROR_RESPONSE,
    INTERNAL_SERVER_ERROR_STATUS_CODE,
} from "@/lib/constants/error.constant.js";

const configureErrorHandler = async (fastify: FastifyInstance) => {
    fastify.setErrorHandler((error, request, reply) => {
        // Hide not predefined errors from the client and just log them.
        if (!("statusCode" in error)) {
            request.log.error(error, error.message);

            // Returning a generic error message instead.
            // Do not use an Error instance reply value because it creates
            // an error log with unnecessary stack trace.
            return reply
                .status(INTERNAL_SERVER_ERROR_STATUS_CODE)
                .send(INTERNAL_SERVER_ERROR_RESPONSE);
        }

        // Use parent error handler with the predefined error.
        return reply.send(error);
    });
};

export default fp(configureErrorHandler, {});
