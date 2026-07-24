export const templates = {
    type: (nameKebab) => `// Types for the ${nameKebab} module\n`,

    handler: (namePascal, nameCamel) =>
        `
import { addDIResolverName } from "@/lib/awilix/awilix.js";

export type ${namePascal}Handler = {};

export const createHandler = (): ${namePascal}Handler => {
    return {};
};

addDIResolverName(createHandler, "${nameCamel}Handler");
`.trim(),

    route: (namePascal, nameCamel, nameKebab, nameUpper) =>
        `
import { FastifyInstance } from "fastify";
import { ${namePascal}Handler } from "./${nameKebab}.handler.js";

// The module tag and its route paths live here, next to the routes:
//
// const ${nameUpper}_TAG = "${nameKebab}";
//
// enum ${namePascal}Route {
//     Root = "/",
// }
//
// Rename the parameters once the first route is registered:
// fastify.get(
//     ${namePascal}Route.Root,
//     { schema: { tags: [${nameUpper}_TAG] } },
//     ${nameCamel}Handler.something
// );
export const create${namePascal}Routes = (
    _fastify: FastifyInstance,
    _${nameCamel}Handler: ${namePascal}Handler
) => {};
`.trim(),

    index: (namePascal, nameCamel, nameKebab) =>
        `
import { FastifyInstance } from "fastify";
import { create${namePascal}Routes } from "./${nameKebab}.route.js";

// Define the endpoint prefix by providing autoPrefix module property.
export const autoPrefix = "/api/${nameKebab}";

export default async function (fastify: FastifyInstance) {
    const ${nameCamel}Handler = fastify.di.resolve("${nameCamel}Handler");
    create${namePascal}Routes(fastify, ${nameCamel}Handler);
}
`.trim(),

    service: (namePascal, nameCamel) =>
        `
import { addDIResolverName } from "@/lib/awilix/awilix.js";

export type ${namePascal}Service = {};

export const createService = (): ${namePascal}Service => ({});

addDIResolverName(createService, "${nameCamel}Service");
`.trim(),
};
