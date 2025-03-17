import fp from "fastify-plugin";
import fastifyCors from "@fastify/cors";
import { FastifyInstance } from "fastify";

const configureCors = async (fastify: FastifyInstance) => {
    await fastify.register(fastifyCors, {
        origin: true,
        credentials: true,
    });
};

export default fp(configureCors, {});
