import { asFunction, RESOLVER } from "awilix";
import type { Cradle } from "@/types/di-container.type.js";
import type {
    AwilixContainer,
    BuildResolverOptions,
    FunctionReturning,
} from "awilix";

type RegisteredFactory = FunctionReturning<unknown> & {
    [RESOLVER]: { name: keyof Cradle };
};

/** Custom resolver options register function that will throw an error
 * if the provided container name is already registered within the system.
 **/
export const resolverOptionsRegister =
    (di: AwilixContainer<Cradle>) =>
    (factory: RegisteredFactory, options?: BuildResolverOptions<unknown>) => {
        const name = factory[RESOLVER].name;

        if (di.hasRegistration(name)) {
            throw new Error(
                `Module "${name}" is already registered in the container.`
            );
        }

        return asFunction(factory, options);
    };
