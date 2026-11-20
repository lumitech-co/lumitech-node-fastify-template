import fs from "fs";
import path from "path";

export const generateSchema = ({ unit, dir }) => {
    const schemaFilePath = path.join(
        process.cwd(),
        "src/modules",
        dir,
        `${unit.kebab}.schema.ts`
    );

    fs.writeFileSync(
        schemaFilePath,
        `// Zod schemas for the ${unit.kebab} module\n`
    );

    console.log(`📄 Created file: ${schemaFilePath}`);
};
