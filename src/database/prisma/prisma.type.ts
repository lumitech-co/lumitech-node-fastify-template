/**
 * Convert Prisma model method return type from PrismaPromise to Promise.
 * */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrismaAwaited<T extends (...args: any) => any> = Promise<
    Awaited<ReturnType<T>>
>;
