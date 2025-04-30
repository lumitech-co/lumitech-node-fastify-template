export const templates = {
    handler: (namePascal, nameCamel) =>
        `
import { addDIResolverName } from "@/lib/awilix/awilix.js";

export type ${namePascal}Handler = {};

export const create${namePascal}Handler = (): ${namePascal}Handler => {
    return {};
};

addDIResolverName(create${namePascal}Handler, "${nameCamel}Handler");
`.trim(),

    route: (namePascal, nameCamel, nameKebab) =>
        `
import { FastifyInstance } from "fastify";
import { ${namePascal}Handler } from "./${nameKebab}.handler.js";

enum ${namePascal}Routes {}

export const create${namePascal}Routes = (
    fastify: FastifyInstance,
    ${nameCamel}Handler: ${namePascal}Handler
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

export const create${nameCamel}Service = (): ${namePascal}Service => ({});

addDIResolverName(create${nameCamel}Service, "${nameCamel}Service");

  `.trim(),
};
