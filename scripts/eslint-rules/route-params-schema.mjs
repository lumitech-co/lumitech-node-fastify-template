// A route whose path has a `:param` declares schema.params, so the param is
// validated by Zod instead of reaching the handler as an unchecked string.
const HTTP_METHODS = new Set([
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
]);

const hasParamsSchema = (options) =>
    options?.type === "ObjectExpression" &&
    options.properties.some(
        (property) =>
            property.type === "Property" &&
            property.key.name === "schema" &&
            property.value.type === "ObjectExpression" &&
            property.value.properties.some(
                (inner) =>
                    inner.type === "Property" && inner.key.name === "params"
            )
    );

export default {
    meta: {
        type: "problem",
        schema: [],
        messages: {
            missingParams:
                "The path {{path}} has a :param — declare schema.params with a Zod schema (CLAUDE.md, Rule 7).",
        },
    },
    create(context) {
        const paramPaths = new Map();

        return {
            TSEnumDeclaration(node) {
                const members = node.body?.members ?? node.members;

                for (const member of members) {
                    const value = member.initializer?.value;

                    if (typeof value === "string" && value.includes(":")) {
                        paramPaths.set(
                            `${node.id.name}.${member.id.name}`,
                            value
                        );
                    }
                }
            },
            CallExpression(node) {
                const { callee } = node;

                if (
                    callee.type !== "MemberExpression" ||
                    callee.object.name !== "fastify" ||
                    !HTTP_METHODS.has(callee.property.name)
                ) {
                    return;
                }

                const [route, options] = node.arguments;

                const path =
                    route?.type === "MemberExpression"
                        ? paramPaths.get(
                              `${route.object.name}.${route.property.name}`
                          )
                        : undefined;

                if (path && !hasParamsSchema(options)) {
                    context.report({
                        node,
                        messageId: "missingParams",
                        data: { path },
                    });
                }
            },
        };
    },
};
