/**
 * Handlers must hand `reply.send()` a value bound to an explicitly-typed `const`,
 * so the route's response contract is checked at the handler — a drift in the
 * service's return shape errors here instead of silently shipping.
 *
 *   ✗  return reply.send(await svc.getThing(args));          // inline, untyped
 *   ✗  const data = await svc.getThing(args); return reply.send(data);  // const, no type
 *   ✓  const response: GetThingResponse = await svc.getThing(args);
 *      return reply.status(200).send(response);
 *
 * Non-JSON bodies (streams / buffers / zips) are exempt by name.
 *
 * Ported from tolmete-api.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
// Word-bounded (plus camelCase-suffix) so `profile` doesn't match `file` etc.
const NON_JSON_BODY =
    /\b(stream|buffer|zip|file|pdf|csv|blob|archive|raw)\b|(Stream|Buffer|Zip|File|Pdf|Csv|Blob|Archive|Raw)$/;

const replyRootName = (node) => {
    let current = node;

    while (current) {
        if (current.type === "Identifier") {
            return current.name;
        }

        if (current.type === "MemberExpression") {
            current = current.object;
        } else if (current.type === "CallExpression") {
            current = current.callee;
        } else {
            return null;
        }
    }

    return null;
};

// Any `const`/`let`/`var` binding counts — an untyped `let` dodges the contract
// just as much as an untyped `const`.
const findVariableDeclarator = (scope, name) => {
    for (let current = scope; current; current = current.upper) {
        const variable = current.variables.find((v) => v.name === name);

        if (variable) {
            const def = variable.defs[0];

            return def?.type === "Variable" ? def.node : null;
        }
    }

    return null;
};

export default {
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Handlers must pass an explicitly-typed `const` to `reply.send()` so the route response contract is checked.",
        },
        messages: {
            inline: "Bind the response to an explicitly-typed `const` before `reply.send()` — don't send an inline {{kind}}, so a service-shape change errors here.",
            untyped:
                "Annotate the type of `{{name}}` (e.g. `const {{name}}: SomeResponse = …`) so `reply.send()` verifies the response contract.",
        },
        schema: [],
    },

    create(context) {
        const sourceCode = context.sourceCode;

        return {
            "CallExpression[callee.property.name='send']"(node) {
                if (node.callee.type !== "MemberExpression") {
                    return;
                }

                const root = replyRootName(node.callee.object);

                if (root !== "reply" && root !== "res") {
                    return;
                }

                const arg = node.arguments[0];

                if (!arg) {
                    return;
                }

                if (
                    arg.type === "CallExpression" ||
                    arg.type === "AwaitExpression"
                ) {
                    context.report({
                        node: arg,
                        messageId: "inline",
                        data: { kind: "call" },
                    });

                    return;
                }

                if (arg.type === "ObjectExpression") {
                    // Only the service-data envelope ({ data: … }) carries a
                    // shape that can drift; trivial acks ({ message }) and
                    // protocol literals ({ challenge }) need no typed binding.
                    const hasDataEnvelope = arg.properties.some(
                        (prop) =>
                            prop.type === "Property" &&
                            !prop.computed &&
                            ((prop.key.type === "Identifier" &&
                                prop.key.name === "data") ||
                                (prop.key.type === "Literal" &&
                                    prop.key.value === "data"))
                    );

                    if (hasDataEnvelope) {
                        context.report({
                            node: arg,
                            messageId: "inline",
                            data: { kind: "object" },
                        });
                    }

                    return;
                }

                if (arg.type === "Identifier") {
                    if (NON_JSON_BODY.test(arg.name)) {
                        return;
                    }

                    const declarator = findVariableDeclarator(
                        sourceCode.getScope(arg),
                        arg.name
                    );

                    if (
                        declarator?.id?.type === "Identifier" &&
                        !declarator.id.typeAnnotation
                    ) {
                        context.report({
                            node: arg,
                            messageId: "untyped",
                            data: { name: arg.name },
                        });
                    }
                }
            },
        };
    },
};
