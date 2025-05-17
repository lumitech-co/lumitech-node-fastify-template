export const templates = {
    repository: (nameCamel, namePascal) =>
        `
import { PrismaClient } from "@prisma/client";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { BaseRepository, generateRepository } from "../generate.repository.js";

export type ${namePascal}Repository = BaseRepository<"${nameCamel}"> & {};

export const create${namePascal}Repository = (
    prisma: PrismaClient
): ${namePascal}Repository => {
    const repository = generateRepository(prisma, "${namePascal}");

    return {
        ...repository,
    };
};

addDIResolverName(create${namePascal}Repository, "${nameCamel}Repository");
`.trim(),
};
