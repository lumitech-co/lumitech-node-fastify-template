import * as fastifyTypeProviderZod from "fastify-type-provider-zod";
import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyBasicAuth from "@fastify/basic-auth";
import { FastifyInstance } from "fastify";
import { UnauthorizedError } from "@/lib/errors/errors.js";
import { FastifyPlugin } from "@/lib/fastify/fastify.constant.js";

const basicAuthUsername = "admin";

const configureSwagger = async (fastify: FastifyInstance) => {
    await fastify.register(fastifySwagger, {
        openapi: {
            openapi: "3.1.0",
            info: {
                title: "Fastify template API",
                version: "0.1.0",
            },
        },
        transform: fastifyTypeProviderZod.jsonSchemaTransform,
    });

    const docsPassword = fastify.config.DOCS_PASSWORD;

    if (docsPassword) {
        await fastify.register(fastifyBasicAuth, {
            validate(username, password, _req, _reply, done) {
                if (
                    username === basicAuthUsername &&
                    password === docsPassword
                ) {
                    done();

                    return;
                }

                done(UnauthorizedError("Invalid credentials"));
            },
            authenticate: true,
        });
    }

    await fastify.register(fastifySwaggerUi, {
        routePrefix: "/api/docs",
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
