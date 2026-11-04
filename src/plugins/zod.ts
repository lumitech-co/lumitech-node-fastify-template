import fp from "fastify-plugin";
import type { FastifyInstance, FastifySerializerCompiler } from "fastify";
import {
    serializerCompiler,
    validatorCompiler,
} from "fastify-type-provider-zod";

/**
 * The provider's .d.ts imports "fastify/types/schema" without an extension,
 * which nodenext cannot resolve, so serializerCompiler arrives untyped.
 */
const typedSerializerCompiler =
    serializerCompiler as FastifySerializerCompiler<unknown>;

const configure = async (fastify: FastifyInstance) => {
    fastify.setValidatorCompiler(validatorCompiler);
    fastify.setSerializerCompiler(typedSerializerCompiler);
};

export default fp(configure, {});
