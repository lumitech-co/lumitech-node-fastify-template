import fs from "fs";
import path from "path";
import { templates } from "./templates.js";

export const generateRepository = ({ entity, target }) => {
    const { unit, dir } = target;
    const unitPath = path.join(process.cwd(), "src/modules", dir);

    if (!fs.existsSync(path.join(unitPath, "index.ts"))) {
        console.error(
            `❌ Module "${dir}" does not exist — run npm run generate:module ${dir} first.`
        );

        process.exit(1);
    }

    const filePath = path.join(unitPath, `${entity.kebab}.repository.ts`);

    if (fs.existsSync(filePath)) {
        console.error(`❌ Repository "${entity.camel}" already exists!`);
        process.exit(1);
    }

    const typePath = path.join(unitPath, `${unit.kebab}.type.ts`);

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
        `${templates["repository"](entity.camel, entity.pascal, unit.kebab)}\n`
    );

    console.log(`📄 Created file: ${filePath}`);
};
