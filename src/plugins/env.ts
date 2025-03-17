import fp from "fastify-plugin";
import S from "fluent-json-schema";
import fastifyEnv from "@fastify/env";
import { FastifyInstance } from "fastify";
import { FastifyPlugin } from "@/lib/fastify";

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
            .required([
                "NODE_ENV",
                "DATABASE_URL",
                "APPLICATION_SECRET",
                "APPLICATION_URL",
                "PORT",
                "DOCS_PASSWORD",
            ])
            .valueOf(),
        dotenv: process.env.NODE_ENV === "development",
    });
};

export default fp(configureEnv, {
    name: FastifyPlugin.Env,
});
