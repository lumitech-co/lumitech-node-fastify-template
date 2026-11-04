import fs from "fs";
import path from "path";
import { templates } from "./templates.js";

export const generateRepository = ({ entity, module }) => {
    const modulePath = path.join(process.cwd(), "src/modules", module.kebab);

    if (!fs.existsSync(modulePath)) {
        console.error(
            `❌ Module "${module.kebab}" does not exist — run npm run generate:module ${module.camel} first.`
        );

        process.exit(1);
    }

    const filePath = path.join(modulePath, `${entity.kebab}.repository.ts`);

    if (fs.existsSync(filePath)) {
        console.error(`❌ Repository "${entity.camel}" already exists!`);
        process.exit(1);
    }

    const typePath = path.join(modulePath, `${module.kebab}.type.ts`);

    const existingTypes = fs.existsSync(typePath)
        ? fs.readFileSync(typePath, "utf8").trimEnd()
        : "";

    fs.writeFileSync(
        typePath,
        `${[existingTypes, templates["type"](entity.pascal)].filter(Boolean).join("\n\n")}\n`
    );

    console.log(`📄 Added the ${entity.pascal} domain type to ${typePath}`);

    fs.writeFileSync(
        filePath,
        `${templates["repository"](entity.camel, entity.pascal, module.kebab)}\n`
    );

    console.log(`📄 Created file: ${filePath}`);
};
