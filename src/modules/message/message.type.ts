export type DiffObjectsPayload<
    T extends Record<string, unknown>,
    K extends Record<string, unknown>,
> = {
    oldObj: T;
    newObj: K;
};

export type IsEqualPayload = {
    a: unknown;
    b: unknown;
};
