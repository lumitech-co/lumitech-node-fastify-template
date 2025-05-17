import { RESOLVER } from "awilix";
import { Cradle } from "@/types/di-container.type.js";

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
    name: keyof Cradle
): T => {
    return Object.assign(fn, {
        [RESOLVER]: {
            name: name,
        },
    });
};
