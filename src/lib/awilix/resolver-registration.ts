import { Cradle } from "@/types/di-container.type.js";
import {
    asFunction,
    AwilixContainer,
    BuildResolverOptions,
    RESOLVER,
} from "awilix";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResolveRegistration = BuildResolverOptions<any>["register"];

/** Custom resolver options register function that will throw an error
 * if the provided container name is already registered within the system.
 **/
export const resolverOptionsRegister: (
    di: AwilixContainer<Cradle>
) => ResolveRegistration =
    (di) =>
        (...args) => {
            const name = args[0][RESOLVER].name;

            if (di.hasRegistration(name)) {
                throw new Error(
                    `Module "${name}" is already registered in the container.`
                );
            }

            return asFunction(args[0], args[1]);
        };
