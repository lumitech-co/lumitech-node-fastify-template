import { Prisma } from "@prisma/client";
import {
    GetFindResult,
    OperationPayload,
} from "@prisma/client/runtime/library";

/**
 * Convert Prisma model method return type from PrismaPromise to Promise.
 * */
export type PrismaAwaited<
    T extends // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (...args: any) => any,
> = Promise<Awaited<ReturnType<T>>>;

/**
 * A generic function type that finds a unique record in the database or throws an error if not found.
 *
 * The function uses Prisma.SelectSubset to allow for type-safe partial selections from a model.
 * GetFindResult is used to transform the raw database result into the expected return type.
 *
 * @example
 * export type MessageRepository = BaseRepository<"message"> & {
 *   findUniqueOrFail: FindUniqueOrFail<
 *       Prisma.MessageFindUniqueArgs,
 *       Prisma.$MessagePayload
 *   >;
 *};
 * */
export type FindUniqueOrFail<U, R extends OperationPayload> = <T extends U>(
    args: Prisma.SelectSubset<T, U>
) => Promise<GetFindResult<R, T, object>>;
