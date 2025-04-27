// eslint-disable
import fs from "fs";
import path from "path";
import { templates } from "./templates.js";

const moduleName = process.argv[2];

if (!moduleName) {
    console.error(
        "❌ Please provide a module name. Example: node cli/create-module.ts authCustomModule"
    );

    process.exit(1);
}

const nameCamel = moduleName;
const namePascal = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

const modulePath = path.join(process.cwd(), "src/modules", moduleName);
const schemaPath = path.join(process.cwd(), "src/lib/validation", moduleName);

const diContainerPath = path.join(
    process.cwd(),
    "src/types/di-container.type.ts"
);

const files = ["handler.ts", "service.ts", "route.ts", "index.ts"];

if (fs.existsSync(modulePath)) {
    console.error(`❌ Module "${moduleName}" already exists!`);
    process.exit(1);
}

fs.mkdirSync(modulePath, { recursive: true });
console.log(`📁 Created folder: ${modulePath}`);

files.forEach((file) => {
    const fileType = file.replace(".ts", "");
    const filePath = path.join(modulePath, `${nameCamel}.${file}`);

    let content = `// ${file} for ${namePascal}\n`;

    if (templates[fileType]) {
        content = templates[fileType](namePascal, nameCamel);
    }

    fs.writeFileSync(filePath, content);
    console.log(`📄 Created file: ${filePath}`);
});

fs.mkdirSync(schemaPath, { recursive: true });
console.log(`📁 Created schema folder: ${schemaPath}`);

const schemaFilePath = path.join(schemaPath, `${nameCamel}.schema.ts`);
fs.writeFileSync(schemaFilePath, `// Schema for ${namePascal}\n`);
console.log("✅ Schema created successfully!");

let diContent = fs.readFileSync(diContainerPath, "utf8");

// Insert imports if not already there
if (!diContent.includes(`${namePascal}Service`)) {
    const importMarker = 'import { EnvConfig } from "./env.type.js";';

    const newImports = `
import { ${namePascal}Service } from "@/modules/${nameCamel}/${nameCamel}.service.js";
import { ${namePascal}Handler } from "@/modules/${nameCamel}/${nameCamel}.handler.js";`;

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
