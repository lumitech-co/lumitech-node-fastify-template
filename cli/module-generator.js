import fs from "fs";
import path from "path";
import { templates } from "./templates.js";

const moduleName = process.argv[2];

if (!moduleName) {
    console.error(
        "❌ Please provide a module name. Example: npm run generate-module authCustomModule"
    );

    process.exit(1);
}

const nameCamel = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);
const namePascal = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

const nameKebab = moduleName
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

const modulePath = path.join(process.cwd(), "src/modules", nameCamel);
const schemaPath = path.join(process.cwd(), "src/lib/validation", nameCamel);

const diContainerPath = path.join(
    process.cwd(),
    "src/types/di-container.type.ts"
);

const files = ["handler.ts", "service.ts", "route.ts", "index.ts"];

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

// create schema folder
fs.mkdirSync(schemaPath, { recursive: true });
console.log(`📁 Created schema folder: ${schemaPath}`);
// create schema file
const schemaFilePath = path.join(schemaPath, `${nameKebab}.schema.ts`);
fs.writeFileSync(schemaFilePath, `// Schema for ${nameKebab}\n`);
console.log("✅ Schema created successfully!");

// read content from di-container.ts
let diContent = fs.readFileSync(diContainerPath, "utf8");

// Insert imports if not already there
if (!diContent.includes(`${namePascal}Service`)) {
    const importMarker = 'import { EnvConfig } from "./env.type.js";';

    const newImports = `
import { ${namePascal}Service } from "@/modules/${nameCamel}/${nameKebab}.service.js";
import { ${namePascal}Handler } from "@/modules/${nameCamel}/${nameKebab}.handler.js";`;

    diContent = diContent.replace(importMarker, `${importMarker}${newImports}`);
}

// Insert into Cradle type if not already there
if (!diContent.includes(`${nameCamel}Service`)) {
    const cradleMarker = "messageHandler: MessageHandler;";

    const newCradleProps = `\n
    ${nameCamel}Service: ${namePascal}Service;
    ${nameCamel}Handler: ${namePascal}Handler;`;

    diContent = diContent.replace(
        cradleMarker,
        `${cradleMarker}${newCradleProps}`
    );
}

// Save changes
fs.writeFileSync(diContainerPath, diContent);

console.log(`✅ DI container updated with ${nameCamel} service and handler.`);
