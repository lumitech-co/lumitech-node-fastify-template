import fs from "fs";
import path from "path";
import { templates } from "./templates.js";

export const generateModule = (nameCamel, namePascal, nameKebab) => {
    const modulePath = path.join(process.cwd(), "src/modules", nameKebab);

    if (fs.existsSync(modulePath)) {
        console.error(`❌ Module "${nameKebab}" already exists!`);
        process.exit(1);
    }

    fs.mkdirSync(modulePath, { recursive: true });
    console.log(`📁 Created folder: ${modulePath}`);

    const routeContent = templates["route"](namePascal, nameCamel, nameKebab);
    const routeFilePath = path.join(modulePath, `${nameKebab}.route.ts`);
    fs.writeFileSync(routeFilePath, routeContent);

    const handlerContent = templates["handler"](
        namePascal,
        nameCamel,
        nameKebab
    );

    const handlerFilePath = path.join(modulePath, `${nameKebab}.handler.ts`);
    fs.writeFileSync(handlerFilePath, handlerContent);

    const serviceFilePath = path.join(modulePath, `${nameKebab}.service.ts`);

    const serviceContent = templates["service"](
        namePascal,
        nameCamel,
        nameKebab
    );

    fs.writeFileSync(serviceFilePath, serviceContent);

    const indexContent = templates["index"](namePascal, nameCamel, nameKebab);
    const indexFilePath = path.join(modulePath, "index.ts");
    fs.writeFileSync(indexFilePath, indexContent);
};
