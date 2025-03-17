import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

const configureErrorHandler = async (fastify: FastifyInstance) => {
    fastify.setErrorHandler((error, request, reply) => {
        // Hide not predefined errors from the client and just log them.
        if (!("statusCode" in error)) {
            request.log.error(error, error.message);

            // Returning a generic error message instead.
            // Do not use an Error instance reply value because it creates
            // an error log with unnecessary stack trace.
            return reply.status(500).send({
                statusCode: 500,
                code: "500",
                error: "Internal Server Error",
                message: "Internal Server Error",
            });
        }

        // Use parent error handler with the predefined error.
        return reply.send(error);
    });
};

export default fp(configureErrorHandler, {});
