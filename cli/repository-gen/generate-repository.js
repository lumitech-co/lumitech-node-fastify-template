import fs from "fs";
import path from "path";
import { templates } from "./templates.js";

export const generateRepository = (nameCamel, namePascal, nameKebab) => {
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

    const typePath = path.join(repositoryPath, `${nameKebab}.type.ts`);
    fs.writeFileSync(typePath, `${templates["type"](namePascal)}\n`);
    console.log(`📄 Created file: ${typePath}`);

    const filePath = path.join(repositoryPath, `${nameKebab}.repository.ts`);

    const fileContent = templates["repository"](
        nameCamel,
        namePascal,
        nameKebab
    );

    fs.writeFileSync(filePath, `${fileContent}\n`);
    console.log(`📄 Created file: ${filePath}`);
};
