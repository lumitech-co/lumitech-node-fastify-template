import { extendCradle } from "./extend-cradle.js";
import { lintGenerated } from "../lint-generated.js";
import { extendMessages } from "./extend-messages.js";
import { resolveUnit, toNames } from "../unit-path.js";
import { generateRepository } from "./generate-repository.js";

const [, , entityName, flag, moduleFlagValue] = process.argv;

if (!entityName || (flag !== undefined && flag !== "--module")) {
    console.error(
        "❌ Usage: npm run generate:repository <entityName> [--module <moduleName>|<moduleName>/<submoduleName>]"
    );

    process.exit(1);
}

const entity = toNames(entityName);
const target = resolveUnit(moduleFlagValue ?? entityName);

generateRepository({ entity, target });
extendMessages(entity.pascal, entity.camel);
extendCradle({ entity, target });

lintGenerated([
    `src/modules/${target.module.kebab}`,
    "src/types/di-container.type.ts",
    "src/lib/messages/messages.constant.ts",
]);
