import fs from "fs";
import path from "path";
import { extendCradle } from "./extend-cradle.js";
import { generateSchema } from "./shema-generator.js";
import { generateModule } from "./module-generator.js";

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

if (fs.existsSync(modulePath)) {
    console.error(`❌ Module "${nameCamel}" already exists!`);
    process.exit(1);
}

// MODULE
generateModule(modulePath, nameCamel, namePascal, nameKebab);

// VALIDATION SCHEMA
generateSchema(schemaPath, nameKebab);

// EXTEND Cradle TYPE
extendCradle(namePascal, nameCamel, nameKebab);
