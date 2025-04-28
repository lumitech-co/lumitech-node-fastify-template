import { RESOLVER } from "awilix";
import { FastifyInstance } from "fastify";
import { DI_RESOLVERS, DiResolversValues } from "./di-resolvers.js";

/**
 * Adds Awilix RESOLVER property to a service, repository, handler etc. function.
 * It is necessary to add the RESOLVER symbol to provide the name of the registered dependency.
 * Reference link -
 * {@link https://github.com/jeffijoe/awilix?tab=readme-ov-file#inlining-resolver-options}
 *
 * @example
 *
 * const createUserService = (userRepository: UserRepository) => {
 *     // Some logic
 * };
 *
 * addResolverName(createUserService, "userService");
 */
export const addDIResolverName = <T extends object>(
    fn: T,
    name: keyof typeof DI_RESOLVERS
): T => {
    return Object.assign(fn, {
        [RESOLVER]: {
            name: name,
        },
    });
};

export const resolveDI = <T>(
    fastify: FastifyInstance,
    name: DiResolversValues
): T => {
    return fastify.di.resolve(name) as unknown as T;
};
