import { resolveUnit } from "../unit-path.js";
import { extendCradle } from "./extend-cradle.js";
import { lintGenerated } from "../lint-generated.js";
import { generateSchema } from "./shema-generator.js";
import { generateModule } from "./module-generator.js";

const modulePath = process.argv[2];

if (!modulePath) {
    console.error(
        "❌ Please provide a module name. Example: npm run generate:module moduleName (or moduleName/submoduleName)"
    );

    process.exit(1);
}

const target = resolveUnit(modulePath);

// MODULE
generateModule(target);

// VALIDATION SCHEMA
generateSchema(target);

// EXTEND Cradle TYPE
extendCradle(target);

lintGenerated([
    `src/modules/${target.module.kebab}`,
    "src/types/di-container.type.ts",
]);
