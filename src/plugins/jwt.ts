import fp from "fastify-plugin";
import fastifyJWT from "@fastify/jwt";
import { FastifyInstance } from "fastify";
import { FastifyPlugin } from "@/lib/fastify";

const configureJwt = async (fastify: FastifyInstance) => {
    fastify.register(fastifyJWT, {
        secret: fastify.config.APPLICATION_SECRET,
    });
};

export default fp(configureJwt, {
    name: FastifyPlugin.Jwt,
    dependencies: [FastifyPlugin.Env],
});
