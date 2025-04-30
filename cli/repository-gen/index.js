import { extendCradle } from "./extend-cradle.js";
import { generateRepository } from "./generate-repository.js";

const entityName = process.argv[2];

if (!entityName) {
    console.error("❌ Please provide a repository name.");

    process.exit(1);
}

const nameCamel = entityName.charAt(0).toLowerCase() + entityName.slice(1);
const namePascal = entityName.charAt(0).toUpperCase() + entityName.slice(1);

const nameKebab = entityName
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

generateRepository(nameCamel, namePascal, nameKebab);
extendCradle(namePascal, nameCamel, nameKebab);
