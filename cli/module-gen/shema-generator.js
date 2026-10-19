import fs from "fs";
import path from "path";

export const generateSchema = (nameKebab) => {
    const schemaFilePath = path.join(
        process.cwd(),
        "src/modules",
        nameKebab,
        `${nameKebab}.schema.ts`
    );

    fs.writeFileSync(
        schemaFilePath,
        `// Zod schemas for the ${nameKebab} module\n`
    );

    console.log(`📄 Created file: ${schemaFilePath}`);
};
