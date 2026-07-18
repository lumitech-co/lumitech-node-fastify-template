import fp from "fastify-plugin";
import fastifyEnv from "@fastify/env";
import { S } from "fluent-json-schema";
import { FastifyInstance } from "fastify";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";

const configureEnv = async (fastify: FastifyInstance) => {
    await fastify.register(fastifyEnv, {
        schema: S.object()
            .prop(
                "NODE_ENV",
                S.string().enum(["development", "production", "test"])
            )
            .prop("DATABASE_URL", S.string())
            .prop("APPLICATION_SECRET", S.string())
            .prop("APPLICATION_URL", S.string())
            .prop("PORT", S.number())
            .prop("DOCS_PASSWORD", S.string())
            .prop("HOST", S.string().default("0.0.0.0"))
            .prop("GCP_PROJECT_ID", S.string())
            .prop("GCP_CLIENT_EMAIL", S.string())
            .prop("GCP_PRIVATE_KEY", S.string())
            .prop("GCP_BUCKET_NAME", S.string())
            .required([
                "NODE_ENV",
                "DATABASE_URL",
                "APPLICATION_SECRET",
                "APPLICATION_URL",
                "PORT",
                "GCP_BUCKET_NAME",
            ])
            .valueOf(),
        dotenv: false,
    });
};

export default fp(configureEnv, {
    name: FastifyPlugin.Env,
});
