import { isDeepStrictEqual } from "node:util";
import type { DiffObjectsPayload } from "./message.type.js";

/**
 * Example util: keys whose values differ between two flat objects,
 * with values from the new object.
 */
export const diffObjects = <
    T extends Record<string, unknown>,
    K extends Record<string, unknown>,
>({
    oldObj,
    newObj,
}: DiffObjectsPayload<T, K>): Partial<K> => {
    const diff: Partial<K> = {};

    for (const key in newObj) {
        const oldValue = oldObj[key];
        const newValue = newObj[key];

        if (!isDeepStrictEqual(oldValue, newValue)) {
            diff[key] = newValue;
        }
    }

    return diff;
};
