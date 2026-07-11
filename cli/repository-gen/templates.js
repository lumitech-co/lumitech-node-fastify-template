export const templates = {
    repository: (nameCamel, namePascal) =>
        `
import { Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "@/lib/errors/errors.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { generateRepository } from "../generate.repository.js";
import { FindUniqueOrFail } from "@/database/prisma/prisma.type.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import { BaseRepository } from "@/database/repositories/repository.type.js";

export type ${namePascal}Repository = BaseRepository<"${nameCamel}"> & {
    findUniqueOrFail: FindUniqueOrFail<
        Prisma.${namePascal}FindUniqueArgs,
        Prisma.$${namePascal}Payload
    >;
};

export const create${namePascal}Repository = (
    prisma: PrismaClient
): ${namePascal}Repository => {
    const repository = generateRepository(prisma, "${namePascal}");

    return {
        ...repository,
        findUniqueOrFail: async (args) => {
            const ${nameCamel} = await prisma.${nameCamel}.findUnique(args);

            if (!${nameCamel}) {
                throw new NotFoundError(RESPONSE_MESSAGES.${nameCamel}.notFound);
            }

            return ${nameCamel};
        },
    };
};

addDIResolverName(create${namePascal}Repository, "${nameCamel}Repository");
`.trim(),
};
