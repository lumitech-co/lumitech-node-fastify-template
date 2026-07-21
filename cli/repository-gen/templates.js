export const templates = {
    repository: (nameCamel, namePascal, tableName) =>
        `
import { eq } from "drizzle-orm";
import { ${tableName} } from "@/database/drizzle/schema.js";
import { NotFoundError } from "@/lib/errors/errors.js";
import { addDIResolverName } from "@/lib/awilix/awilix.js";
import { generateRepository } from "../generate.repository.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";
import { Database, Transaction } from "@/database/drizzle/drizzle.type.js";
import {
    BaseRepository,
    Entity,
} from "@/database/repositories/repository.type.js";

export type ${namePascal} = Entity<typeof ${tableName}>;

export type Find${namePascal}ByIdOrFailArgs = {
    id: number;
    tx?: Transaction;
};

export type ${namePascal}Repository = BaseRepository<typeof ${tableName}> & {
    findByIdOrFail: (args: Find${namePascal}ByIdOrFailArgs) => Promise<${namePascal}>;
};

export const create${namePascal}Repository = (
    db: Database
): ${namePascal}Repository => {
    const repository = generateRepository(db, ${tableName});

    return {
        ...repository,
        findByIdOrFail: async ({ id, tx }) => {
            const ${nameCamel} = await repository.findFirst({
                where: eq(${tableName}.id, id),
                tx,
            });

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
