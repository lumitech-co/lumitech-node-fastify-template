import * as messageSchema from "@/lib/validation/message";
import * as fastifyTypeProviderZod from "fastify-type-provider-zod";
import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyBasicAuth from "@fastify/basic-auth";
import { FastifyInstance } from "fastify";
import { FastifyPlugin } from "@/lib/fastify";
import { UnauthorizedError } from "@/lib/errors";

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
        // Add validation schemas to create a separate schema refs section with type definitions.
        // Link: https://github.com/turkerdev/fastify-type-provider-zod?tab=readme-ov-file#how-to-create-refs-to-the-schemas
        transformObject: fastifyTypeProviderZod.createJsonSchemaTransformObject(
            {
                schemas: {
                    ...messageSchema,
                },
            }
        ),
    });

    const isProduction = fastify.config.NODE_ENV === "production";

    if (isProduction) {
        const basicAuthPassword = fastify.config.DOCS_PASSWORD;

        await fastify.register(fastifyBasicAuth, {
            // eslint-disable-next-line max-params
            validate(username, password, _req, _reply, done) {
                if (
                    username === basicAuthUsername &&
                    password === basicAuthPassword
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
            onRequest: isProduction ? fastify.basicAuth : undefined,
        },
    });
};

export default fp(configureSwagger, {
    dependencies: [FastifyPlugin.Env],
    // Do not encapsulate to get the endpoints from the routes.
    encapsulate: false,
});
