import { RESOLVER } from "awilix";
import { Cradle } from "@/types/di-container.type.js";

/**
 * Sets the Awilix RESOLVER name a factory is registered under.
 * Usage: ARCHITECTURE.md, "Dependency Injection Pattern".
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
