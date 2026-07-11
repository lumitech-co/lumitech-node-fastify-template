import { PrismaClient } from "@prisma/client";
import { BaseRepository, Model } from "./repository.type.js";

/**
 * Generate a repository for a given database table.
 * Contains all the CRUD operations for the model from the Prisma client.
 *
 * @example
 * const userRepository = generateRepository(prismaClient ,"User");
 *
 * const user = await userRepository.create({
 *     data: {},
 *     select: {},
 * });
 *
 * await userRepository.delete({
 *     where: {},
 * });
 * */
export const generateRepository = <T extends Model>(
    prisma: PrismaClient,
    model: T
): BaseRepository<Uncapitalize<T>> => {
    const modelInstanceName = uncapitalizeString(model);

    const delegate = prisma[modelInstanceName];

    const create = delegate["create"] as (typeof delegate)["create"];

    const createMany = delegate[
        "createMany"
    ] as (typeof delegate)["createMany"];

    const count = delegate["count"] as (typeof delegate)["count"];

    const findUnique = delegate[
        "findUnique"
    ] as (typeof delegate)["findUnique"];

    const findFirst = delegate["findFirst"] as (typeof delegate)["findFirst"];

    const update = delegate["update"] as (typeof delegate)["update"];

    const upsert = delegate["upsert"] as (typeof delegate)["upsert"];

    const updateMany = delegate[
        "updateMany"
    ] as (typeof delegate)["updateMany"];

    const deleteOne = delegate["delete"] as (typeof delegate)["delete"];

    const findMany = delegate["findMany"] as (typeof delegate)["findMany"];

    const deleteMany = delegate[
        "deleteMany"
    ] as (typeof delegate)["deleteMany"];

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

const uncapitalizeString = <T extends string>(str: T): Uncapitalize<T> => {
    return (str.charAt(0).toLowerCase() + str.slice(1)) as Uncapitalize<T>;
};
