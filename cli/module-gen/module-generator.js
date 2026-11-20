import fs from "fs";
import path from "path";
import { templates } from "./templates.js";

const MODULES_DIR = path.join(process.cwd(), "src/modules");

// A module with submodules holds only public.ts and README.md in its root.
const ensureModuleRoot = (module) => {
    const rootPath = path.join(MODULES_DIR, module.kebab);

    if (fs.existsSync(path.join(rootPath, "index.ts"))) {
        console.error(
            `❌ "${module.kebab}" is a flat module — it cannot hold submodules.`
        );

        process.exit(1);
    }

    if (fs.existsSync(rootPath)) {
        return;
    }

    fs.mkdirSync(rootPath, { recursive: true });

    fs.writeFileSync(
        path.join(rootPath, "public.ts"),
        templates["modulePublic"]()
    );

    fs.writeFileSync(
        path.join(rootPath, "README.md"),
        `${templates["moduleReadme"](module.pascal)}\n`
    );

    console.log(`📁 Created module root: ${rootPath}`);
};

export const generateModule = ({ unit, module, grouped, dir }) => {
    const { camel: nameCamel, pascal: namePascal, kebab: nameKebab } = unit;
    const unitPath = path.join(MODULES_DIR, dir);

    if (fs.existsSync(unitPath)) {
        console.error(`❌ Module "${dir}" already exists!`);
        process.exit(1);
    }

    if (grouped) {
        ensureModuleRoot(module);
    }

    const nameUpper = nameKebab.replace(/-/g, "_").toUpperCase();

    fs.mkdirSync(unitPath, { recursive: true });
    console.log(`📁 Created folder: ${unitPath}`);

    const typeContent = templates["type"](nameKebab);
    const typeFilePath = path.join(unitPath, `${nameKebab}.type.ts`);
    fs.writeFileSync(typeFilePath, typeContent);

    const routeContent = templates["route"](
        namePascal,
        nameCamel,
        nameKebab,
        nameUpper
    );

    const routeFilePath = path.join(unitPath, `${nameKebab}.route.ts`);
    fs.writeFileSync(routeFilePath, `${routeContent}\n`);

    const handlerContent = templates["handler"](namePascal, nameCamel);
    const handlerFilePath = path.join(unitPath, `${nameKebab}.handler.ts`);
    fs.writeFileSync(handlerFilePath, `${handlerContent}\n`);

    const serviceContent = templates["service"](namePascal, nameCamel);
    const serviceFilePath = path.join(unitPath, `${nameKebab}.service.ts`);
    fs.writeFileSync(serviceFilePath, `${serviceContent}\n`);

    const indexContent = templates["index"](namePascal, nameCamel, nameKebab);
    const indexFilePath = path.join(unitPath, "index.ts");
    fs.writeFileSync(indexFilePath, `${indexContent}\n`);

    if (!grouped) {
        const publicFilePath = path.join(unitPath, "public.ts");
        fs.writeFileSync(publicFilePath, templates["public"](nameKebab));
    }

    const readmeContent = templates["readme"](namePascal, nameKebab);
    const readmeFilePath = path.join(unitPath, "README.md");
    fs.writeFileSync(readmeFilePath, `${readmeContent}\n`);
};
