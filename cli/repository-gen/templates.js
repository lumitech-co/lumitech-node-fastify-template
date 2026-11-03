export const templates = {
    type: (namePascal) =>
        `
export type ${namePascal} = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
};

export type ${namePascal}Id = Pick<${namePascal}, "id">;
`.trim(),

    repository: (nameCamel, namePascal, moduleKebab) =>
        `
import { NotFoundError } from "@/lib/errors/errors.js";
import type { Prisma, PrismaClient } from "@prisma/client";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import type { ${namePascal}, ${namePascal}Id } from "./${moduleKebab}.type.js";

const ${nameCamel}Select = {
    id: true,
    createdAt: true,
    updatedAt: true,
} satisfies Prisma.${namePascal}Select;

export type ${namePascal}Repository = {
    findByIdOrFail: (${nameCamel}: ${namePascal}Id) => Promise<${namePascal}>;
};

export const create${namePascal}Repository = (
    prisma: PrismaClient
): ${namePascal}Repository => ({
    findByIdOrFail: async ({ id }) => {
        const ${nameCamel} = await prisma.${nameCamel}.findUnique({
            where: { id },
            select: ${nameCamel}Select,
        });

        if (!${nameCamel}) {
            throw new NotFoundError(RESPONSE_MESSAGES.${nameCamel}.notFound);
        }

        return ${nameCamel};
    },
});

addDIResolverName(create${namePascal}Repository, "${nameCamel}Repository");
`.trim(),
};
