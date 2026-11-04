// A factory helper exposed by shorthand in `return { name }` but referenced
// nowhere else reads as "reused internally" when it is not — write it inline
// as a property of the returned object. Ported from tolmete-api.
export default {
    meta: {
        type: "suggestion",
        messages: {
            unshared:
                "`{{name}}` is exposed by shorthand but referenced nowhere else in the factory — write it inline as a property of the returned object. The `function` declaration form is for helpers that are actually reused internally.",
        },
        schema: [],
    },

    create(context) {
        const { sourceCode } = context;

        return {
            VariableDeclarator(node) {
                if (
                    node.id.type !== "Identifier" ||
                    !/^create[A-Z]/.test(node.id.name)
                ) {
                    return;
                }

                const factory = node.init;

                if (
                    !factory ||
                    (factory.type !== "ArrowFunctionExpression" &&
                        factory.type !== "FunctionExpression") ||
                    factory.body.type !== "BlockStatement"
                ) {
                    return;
                }

                const factoryScope = sourceCode.scopeManager.acquire(factory);

                if (!factoryScope) {
                    return;
                }

                const returned = factory.body.body.find(
                    (statement) =>
                        statement.type === "ReturnStatement" &&
                        statement.argument?.type === "ObjectExpression"
                );

                if (!returned) {
                    return;
                }

                const helpers = new Set();

                for (const statement of factory.body.body) {
                    if (
                        statement.type === "FunctionDeclaration" &&
                        statement.id
                    ) {
                        helpers.add(statement.id.name);
                    }
                }

                for (const property of returned.argument.properties) {
                    if (
                        property.type !== "Property" ||
                        property.computed ||
                        property.key.type !== "Identifier" ||
                        property.value.type !== "Identifier"
                    ) {
                        continue;
                    }

                    const name = property.value.name;

                    if (!helpers.has(name)) {
                        continue;
                    }

                    const variable = factoryScope.variables.find(
                        (candidate) => candidate.name === name
                    );

                    if (!variable) {
                        continue;
                    }

                    const referencedElsewhere = variable.references.some(
                        (reference) =>
                            reference.identifier.range[0] < property.range[0] ||
                            reference.identifier.range[1] > property.range[1]
                    );

                    if (referencedElsewhere) {
                        continue;
                    }

                    context.report({
                        node: property.value,
                        messageId: "unshared",
                        data: { name },
                    });
                }
            },
        };
    },
};
