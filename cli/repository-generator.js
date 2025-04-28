import fs from "fs";
import path from "path";

export const generateRepository = (entitiesAsString) => {
    const cleaned = entitiesAsString.replace(/^\[|\]$/g, "");
    const arrayOfEntities = cleaned.split(",").map((entity) => entity.trim());

    const prismaSchemaPath = path.join(
        process.cwd(),
        "src/database/prisma/schema.prisma"
    );

    let prismaContent = fs.readFileSync(prismaSchemaPath, "utf8");

    const newModels = arrayOfEntities
        .map(
            (entity) => `
model ${entity} {
  id        Int      @id @default(autoincrement())
}
`
        )
        .join(" ");

    const updatedContent = `${prismaContent.trim()}\n${newModels}`;

    fs.writeFileSync(prismaSchemaPath, updatedContent, "utf8");

    console.log(
        `✅ Successfully added ${arrayOfEntities.length} models to schema.prisma.`
    );
};
