import type { Prisma } from "@prisma/client";
import type {
    GetFindResult,
    OperationPayload,
} from "@prisma/client/runtime/library";

/**
 * findUnique that throws when the record is missing; the result type follows `select`.
 * Usage: ARCHITECTURE.md, "Repository Pattern".
 */
export type FindUniqueOrFail<U, R extends OperationPayload> = <T extends U>(
    args: Prisma.SelectSubset<T, U>
) => Promise<GetFindResult<R, T, object>>;
