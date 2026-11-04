// A private factory helper whose whole body forwards its own parameters to one
// dependency call adds a hop and nothing else. Helpers exposed in the returned
// object are the public surface and exempt. Ported from tolmete-api.
const paramNames = (params) => {
    const names = new Set();

    const add = (param) => {
        if (!param) {
            return;
        }

        if (param.type === "Identifier") {
            names.add(param.name);
        } else if (param.type === "AssignmentPattern") {
            add(param.left);
        } else if (param.type === "RestElement") {
            add(param.argument);
        } else if (param.type === "ObjectPattern") {
            for (const property of param.properties) {
                add(property.value ?? property.argument);
            }
        } else if (param.type === "ArrayPattern") {
            for (const element of param.elements) {
                add(element);
            }
        }
    };

    params.forEach(add);

    return names;
};

const isPassThroughArgument = (argument, params) => {
    if (argument.type === "Identifier") {
        return params.has(argument.name);
    }

    if (argument.type === "ObjectExpression") {
        return argument.properties.every(
            (property) =>
                property.type === "Property" &&
                !property.computed &&
                property.value.type === "Identifier" &&
                params.has(property.value.name)
        );
    }

    return false;
};

const unwrapAwait = (expression) =>
    expression?.type === "AwaitExpression" ? expression.argument : expression;

export default {
    meta: {
        type: "suggestion",
        messages: {
            passThrough:
                "`{{name}}` only forwards to `{{target}}` — call it directly at the call site and delete this helper. A hop that reshapes nothing is not a boundary.",
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

                const exposed = new Set(
                    (returned?.argument.properties ?? [])
                        .filter(
                            (property) =>
                                property.type === "Property" &&
                                property.value.type === "Identifier"
                        )
                        .map((property) => property.value.name)
                );

                for (const statement of factory.body.body) {
                    if (
                        statement.type !== "FunctionDeclaration" ||
                        !statement.id ||
                        exposed.has(statement.id.name)
                    ) {
                        continue;
                    }

                    const body = statement.body.body;

                    if (body.length !== 1) {
                        continue;
                    }

                    const only = body[0];

                    const expression =
                        only.type === "ReturnStatement"
                            ? unwrapAwait(only.argument)
                            : only.type === "ExpressionStatement"
                              ? unwrapAwait(only.expression)
                              : null;

                    if (
                        expression?.type !== "CallExpression" ||
                        expression.callee.type !== "MemberExpression" ||
                        expression.callee.object.type !== "Identifier" ||
                        expression.callee.property.type !== "Identifier"
                    ) {
                        continue;
                    }

                    const target = factoryScope.variables.find(
                        (variable) =>
                            variable.name === expression.callee.object.name
                    );

                    if (!target) {
                        continue;
                    }

                    const params = paramNames(statement.params);

                    if (
                        !expression.arguments.every((argument) =>
                            isPassThroughArgument(argument, params)
                        )
                    ) {
                        continue;
                    }

                    context.report({
                        node: statement.id,
                        messageId: "passThrough",
                        data: {
                            name: statement.id.name,
                            target: `${expression.callee.object.name}.${expression.callee.property.name}`,
                        },
                    });
                }
            },
        };
    },
};
