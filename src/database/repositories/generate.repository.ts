import type { PrismaClient } from "@prisma/client";
import type { BaseRepository, Model } from "./repository.type.js";

/**
 * Builds the base CRUD repository for a Prisma model.
 * Usage: ARCHITECTURE.md, "Repository Pattern".
 */
export const generateRepository = <T extends Model>(
    prisma: PrismaClient,
    model: T
): BaseRepository<Uncapitalize<T>> => {
    const modelInstanceName = uncapitalizeString(model);

    const delegate = prisma[modelInstanceName];

    const create = delegate.create;

    const createMany = delegate.createMany;

    const count = delegate.count;

    const findUnique = delegate.findUnique;

    const findFirst = delegate.findFirst;

    const update = delegate.update;

    const upsert = delegate.upsert;

    const updateMany = delegate.updateMany;

    const deleteOne = delegate.delete;

    const findMany = delegate.findMany;

    const deleteMany = delegate.deleteMany;

    return {
        create,
        createMany,
        findMany,
        count,
        findUnique,
        findFirst,
        update,
        upsert,
        updateMany,
        delete: deleteOne,
        deleteMany,
    };
};

const uncapitalizeString = <T extends string>(str: T): Uncapitalize<T> =>
    (str.charAt(0).toLowerCase() + str.slice(1)) as Uncapitalize<T>;
