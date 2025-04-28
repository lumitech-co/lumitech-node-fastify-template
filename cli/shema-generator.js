import fs from "fs";
import path from "path";

export const generateSchema = (schemaPath, nameKebab) => {
    fs.mkdirSync(schemaPath, { recursive: true });
    console.log(`📁 Created schema folder: ${schemaPath}`);

    const schemaFilePath = path.join(schemaPath, `${nameKebab}.schema.ts`);
    fs.writeFileSync(schemaFilePath, `// Schema for ${nameKebab}\n`);
    console.log("✅ Schema created successfully!");
};
