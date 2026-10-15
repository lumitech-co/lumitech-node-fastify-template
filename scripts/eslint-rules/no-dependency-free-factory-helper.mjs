// A helper inside a service / repository factory that touches no DI dependency
// and no factory-local binding (followed transitively through sibling helpers)
// is a pure function. Ported from tolmete-api.
export default {
    meta: {
        type: "suggestion",
        messages: {
            dependencyFree:
                "`{{name}}` uses nothing from the factory — no DI dependency, no factory-local binding. Move it to the module's *.util.ts (or a file-level function after the factory) and import it.",
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

                const helpers = new Map();

                for (const statement of factory.body.body) {
                    if (
                        statement.type === "FunctionDeclaration" &&
                        statement.id
                    ) {
                        helpers.set(statement.id.name, statement);
                    }
                }

                const capturesFactoryScope = (start) => {
                    const pending = [start];
                    const visited = new Set();

                    while (pending.length > 0) {
                        const name = pending.pop();

                        if (visited.has(name)) {
                            continue;
                        }

                        visited.add(name);

                        const scope = sourceCode.scopeManager.acquire(
                            helpers.get(name)
                        );

                        if (!scope) {
                            continue;
                        }

                        for (const reference of scope.through) {
                            const resolved = reference.resolved;

                            if (!resolved || resolved.scope !== factoryScope) {
                                continue;
                            }

                            if (helpers.has(resolved.name)) {
                                pending.push(resolved.name);
                                continue;
                            }

                            return true;
                        }
                    }

                    return false;
                };

                for (const [name, declaration] of helpers) {
                    if (capturesFactoryScope(name)) {
                        continue;
                    }

                    context.report({
                        node: declaration.id,
                        messageId: "dependencyFree",
                        data: { name },
                    });
                }
            },
        };
    },
};
