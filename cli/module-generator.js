import fs from "fs";
import path from "path";
import { templates } from "./templates.js";

const files = ["handler.ts", "service.ts", "route.ts", "index.ts"];

export const generateModule = (
    modulePath,
    nameCamel,
    namePascal,
    nameKebab
    // eslint-disable-next-line max-params
) => {
    if (fs.existsSync(modulePath)) {
        console.error(`❌ Module "${nameCamel}" already exists!`);
        process.exit(1);
    }

    fs.mkdirSync(modulePath, { recursive: true });
    console.log(`📁 Created folder: ${modulePath}`);

    files.forEach((file) => {
        const fileType = file.replace(".ts", "");
        const filePath = path.join(modulePath, `${nameKebab}.${file}`); // route.ts -> moduleName.route.ts

        let content = `// ${file} for ${namePascal}\n`;

        // if templates object contains fileType as a key
        if (templates[fileType]) {
            content = templates[fileType](namePascal, nameCamel, nameKebab);
        }

        fs.writeFileSync(filePath, content);
        console.log(`📄 Created file: ${filePath}`);
    });
};
