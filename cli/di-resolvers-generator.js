import fs from "fs";
import path from "path";

export const extendDIResolvers = (nameCamel) => {
    const diResolversPath = path.join(
        process.cwd(),
        "src/lib/awilix/di-resolvers.ts"
    );

    let resolversContent = fs.readFileSync(diResolversPath, "utf8");

    const marker = "const DI_RESOLVERS = {";

    const newResolvers = `
  ${nameCamel}Service: "${nameCamel}Service",
  ${nameCamel}Repository: "${nameCamel}Repository",
  ${nameCamel}Handler: "${nameCamel}Handler",`;

    resolversContent = resolversContent.replace(
        marker,
        `${marker}${newResolvers}`
    );

    fs.writeFileSync(diResolversPath, resolversContent);

    console.log(
        `✅ DI resolvers updated with ${nameCamel} service, handler and repository.`
    );
};
