import fs from "fs";
import path from "path";

export const generateRepository = (repositoryPath, nameKebab) => {
    fs.mkdirSync(repositoryPath, { recursive: true });
    console.log(`📁 Created repository folder: ${repositoryPath}`);

    const repositoryFilePath = path.join(
        repositoryPath,
        `${nameKebab}.repository.ts`
    );

    fs.writeFileSync(repositoryFilePath, `// Repository for ${nameKebab}\n`);
    console.log("✅ Schema created successfully!");
};
