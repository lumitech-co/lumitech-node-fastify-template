import fs from "fs";
import path from "path";

export const extendCradle = (namePascal, nameCamel, nameKebab) => {
    const diContainerPath = path.join(
        process.cwd(),
        "src/types/di-container.type.ts"
    );

    let diContent = fs.readFileSync(diContainerPath, "utf8");

    if (!diContent.includes(`${namePascal}Repository`)) {
        const importMarker = 'import { EnvConfig } from "./env.type.js";';

        const newImports = `
import { ${namePascal}Repository } from "@/database/repositories/${nameKebab}/${nameKebab}.repository.js";`;

        diContent = diContent.replace(
            importMarker,
            `${importMarker}${newImports}`
        );
    }

    const marker = "config: EnvConfig;";

    const newCradleProps = `\n
    ${nameCamel}Repository: ${namePascal}Repository;`;

    diContent = diContent.replace(marker, `${marker}${newCradleProps}`);

    fs.writeFileSync(diContainerPath, diContent);

    console.log(
        `✅ DI container updated with ${nameCamel} service and handler.`
    );
};
