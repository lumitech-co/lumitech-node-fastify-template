import fs from "fs";
import path from "path";
import { templates } from "./templates.js";

export const generateRepository = (
    nameCamel,
    namePascal,
    nameKebab,
    tableName
) => {
    const schemaPath = path.join(
        process.cwd(),
        "src/database/drizzle/schema.ts"
    );

    const schemaContent = fs.readFileSync(schemaPath, "utf8");

    if (!schemaContent.includes(`export const ${tableName} `)) {
        console.error(
            `❌ Table "${tableName}" is not declared in src/database/drizzle/schema.ts.\n` +
                '   Add the table first, then run "npm run db:migrate:create".'
        );

        process.exit(1);
    }

    const repositoryPath = path.join(
        process.cwd(),
        "src/database/repositories",
        nameKebab
    );

    if (fs.existsSync(repositoryPath)) {
        console.error(`❌ Repository "${nameCamel}" already exists!`);
        process.exit(1);
    }

    fs.mkdirSync(repositoryPath, { recursive: true });
    console.log(`📁 Created folder: ${repositoryPath}`);

    const filePath = path.join(repositoryPath, `${nameKebab}.repository.ts`);

    const fileContent = templates["repository"](
        nameCamel,
        namePascal,
        tableName
    );

    fs.writeFileSync(filePath, fileContent);
    console.log(`📄 Created file: ${filePath}`);
};
