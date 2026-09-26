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
 * findUnique that throws when the record is missing; the result type follows `select`.
 * Usage: ARCHITECTURE.md, "Repository Pattern".
 */
export type FindUniqueOrFail<U, R extends OperationPayload> = <T extends U>(
    args: Prisma.SelectSubset<T, U>
) => Promise<GetFindResult<R, T, object>>;
