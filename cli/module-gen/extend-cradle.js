import fs from "fs";
import path from "path";

export const extendCradle = (namePascal, nameCamel, nameKebab) => {
    const diContainerPath = path.join(
        process.cwd(),
        "src/types/di-container.type.ts"
    );

    let diContent = fs.readFileSync(diContainerPath, "utf8");

    if (!diContent.includes(`${namePascal}Service`)) {
        const importMarker = 'import type { EnvConfig } from "./env.type.js";';

        const newImports = `
import type { ${namePascal}Service } from "@/modules/${nameKebab}/${nameKebab}.service.js";
import type { ${namePascal}Handler } from "@/modules/${nameKebab}/${nameKebab}.handler.js";`;

        diContent = diContent.replace(
            importMarker,
            `${importMarker}${newImports}`
        );
    }

    const marker = "config: EnvConfig;";

    const newCradleProps = `\n
    ${nameCamel}Service: ${namePascal}Service;
    ${nameCamel}Handler: ${namePascal}Handler;`;

    diContent = diContent.replace(marker, `${marker}${newCradleProps}`);

    fs.writeFileSync(diContainerPath, diContent);

    console.log(
        `✅ DI container updated with ${nameCamel} service and handler.`
    );
};
