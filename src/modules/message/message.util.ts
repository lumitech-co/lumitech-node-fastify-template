/**
 * Example function.
 *
 * Compare two flat objects and return an object containing
 * only the keys whose values differ, with values from the new object.
 */
export const diffObjects = <
    T extends Record<string, unknown>,
    K extends Record<string, unknown>,
>(
        oldObj: T,
        newObj: K
    ): Partial<K> => {
    const diff: Partial<K> = {};

    for (const key in newObj) {
        const oldValue = oldObj[key];
        const newValue = newObj[key];

        if (!isEqual(oldValue, newValue)) {
            diff[key] = newValue;
        }
    }

    return diff;
};

const isEqual = (a: unknown, b: unknown): boolean => {
    if (a === b) {
        return true;
    }

    if (a == null || b == null) {
        return a === b;
    }

    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        return (
            a.length === b.length &&
            a.every((val, index) => isEqual(val, b[index]))
        );
    }

    if (typeof a === "object" && typeof b === "object") {
        const aObj = a as Record<string, unknown>;
        const bObj = b as Record<string, unknown>;

        const aKeys = Object.keys(aObj);
        const bKeys = Object.keys(bObj);

        return (
            aKeys.length === bKeys.length &&
            aKeys.every((key) => isEqual(aObj[key], bObj[key]))
        );
    }

    return false;
};
