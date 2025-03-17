import * as fastifyTypeProviderZod from "fastify-type-provider-zod";
import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

const configure = async (fastify: FastifyInstance) => {
    fastify.setValidatorCompiler(fastifyTypeProviderZod.validatorCompiler);
    fastify.setSerializerCompiler(fastifyTypeProviderZod.serializerCompiler);
};

export default fp(configure, {});
