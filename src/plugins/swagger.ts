import * as fastifyTypeProviderZod from "fastify-type-provider-zod";
import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyBasicAuth from "@fastify/basic-auth";
import { FastifyInstance } from "fastify";
import { UnauthorizedError } from "@/lib/errors/errors.js";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";
import {
    SWAGGER_API_TITLE,
    SWAGGER_API_VERSION,
    SWAGGER_BASIC_AUTH_USERNAME,
    SWAGGER_INVALID_CREDENTIALS_ERROR,
    SWAGGER_OPENAPI_VERSION,
    SWAGGER_ROUTE_PREFIX,
} from "@/lib/constants/swagger.constant.js";

const configureSwagger = async (fastify: FastifyInstance) => {
    await fastify.register(fastifySwagger, {
        openapi: {
            openapi: SWAGGER_OPENAPI_VERSION,
            info: {
                title: SWAGGER_API_TITLE,
                version: SWAGGER_API_VERSION,
            },
        },
        transform: fastifyTypeProviderZod.jsonSchemaTransform,
    });

    const docsPassword = fastify.config.DOCS_PASSWORD;

    if (docsPassword) {
        await fastify.register(fastifyBasicAuth, {
            validate(username, password, _req, _reply, done) {
                if (
                    username === SWAGGER_BASIC_AUTH_USERNAME &&
                    password === docsPassword
                ) {
                    done();

                    return;
                }

                done(new UnauthorizedError(SWAGGER_INVALID_CREDENTIALS_ERROR));
            },
            authenticate: true,
        });
    }

    await fastify.register(fastifySwaggerUi, {
        routePrefix: SWAGGER_ROUTE_PREFIX,
        uiHooks: {
            onRequest: docsPassword ? fastify.basicAuth : undefined,
        },
    });
};

export default fp(configureSwagger, {
    dependencies: [FastifyPlugin.Env],
    // Do not encapsulate to get the endpoints from the routes.
    encapsulate: false,
});
