import { extendCradle } from "./extend-cradle.js";
import { lintGenerated } from "../lint-generated.js";
import { extendMessages } from "./extend-messages.js";
import { generateRepository } from "./generate-repository.js";

const toNames = (name) => ({
    camel: name.charAt(0).toLowerCase() + name.slice(1),
    pascal: name.charAt(0).toUpperCase() + name.slice(1),
    kebab: name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
});

const [, , entityName, flag, moduleFlagValue] = process.argv;

if (!entityName || (flag !== undefined && flag !== "--module")) {
    console.error(
        "❌ Usage: npm run generate:repository <entityName> [--module <moduleName>]"
    );

    process.exit(1);
}

const entity = toNames(entityName);
const module = toNames(moduleFlagValue ?? entityName);

generateRepository({ entity, module });
extendMessages(entity.pascal, entity.camel);
extendCradle({ entity, module });

lintGenerated([
    `src/modules/${module.kebab}`,
    "src/types/di-container.type.ts",
    "src/lib/messages/messages.constant.ts",
]);
