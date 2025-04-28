import fs from "fs";
import path from "path";
import { templates } from "./templates.js";

export const generatePrismSchema = (namePascal, nameCamel) => {
    const prismaSchemaPath = path.join(
        process.cwd(),
        "src/database/prisma/schema.prisma"
    );

    let prismaContent = fs.readFileSync(prismaSchemaPath, "utf8");

    const prismaModelTemplate = templates["model"](namePascal, nameCamel);

    const updatedContent = `${prismaContent.trim()}\n${prismaModelTemplate}`;

    fs.writeFileSync(prismaSchemaPath, updatedContent, "utf8");

    console.log(`✅ Successfully added ${namePascal} model to schema.prisma.`);
};
