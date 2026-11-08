/**
 * Request schemas (`*BodySchema`, `*QuerySchema`, `*ParamsSchema`, `*HeadersSchema`)
 * and every schema of the same file they use bound each string and array with
 * `.max()`: bodyLimit caps the payload, not one field of it.
 */

const REQUEST_SCHEMA = /(Body|Query|Params?|Headers)Schema$/;
const UNBOUNDED_KINDS = new Set(["string", "url", "httpUrl", "email", "array"]);
const BOUNDING_METHODS = new Set(["max", "length"]);

const childNodes = (node) =>
    Object.entries(node)
        .filter(([key]) => key !== "parent")
        .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
        .filter((value) => typeof value?.type === "string");

const walk = (node, visit) => {
    visit(node);
    childNodes(node).forEach((child) => walk(child, visit));
};

const chainMethods = (call) => {
    const methods = [];
    let node = call;

    while (
        node.parent?.type === "MemberExpression" &&
        node.parent.object === node &&
        node.parent.parent?.type === "CallExpression"
    ) {
        methods.push(node.parent.property.name);
        node = node.parent.parent;
    }

    return methods;
};

export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "Require .max() on strings and arrays of request schemas.",
        },
        messages: {
            unbounded:
                "Bound this z.{{kind}}() with .max(): a request schema caps every string and array it accepts (CLAUDE.md, Rule 7). Keep the limit as a constant next to the schema.",
        },
        schema: [],
    },

    create(context) {
        return {
            Program(program) {
                const schemas = new Map(
                    program.body
                        .flatMap((statement) =>
                            statement.type === "ExportNamedDeclaration"
                                ? [statement.declaration]
                                : [statement]
                        )
                        .filter(
                            (statement) =>
                                statement?.type === "VariableDeclaration"
                        )
                        .flatMap((statement) => statement.declarations)
                        .filter(
                            (declarator) =>
                                declarator.id.type === "Identifier" &&
                                declarator.init
                        )
                        .map((declarator) => [
                            declarator.id.name,
                            declarator.init,
                        ])
                );

                const pending = [...schemas.keys()].filter((name) =>
                    REQUEST_SCHEMA.test(name)
                );

                const checked = new Set();

                while (pending.length > 0) {
                    const name = pending.pop();

                    if (checked.has(name)) {
                        continue;
                    }

                    checked.add(name);

                    walk(schemas.get(name), (node) => {
                        if (
                            node.type === "Identifier" &&
                            schemas.has(node.name)
                        ) {
                            pending.push(node.name);
                        }

                        const isUnboundedKind =
                            node.type === "CallExpression" &&
                            node.callee.type === "MemberExpression" &&
                            node.callee.object.type === "Identifier" &&
                            node.callee.object.name === "z" &&
                            UNBOUNDED_KINDS.has(node.callee.property.name);

                        if (
                            isUnboundedKind &&
                            !chainMethods(node).some((method) =>
                                BOUNDING_METHODS.has(method)
                            )
                        ) {
                            context.report({
                                node,
                                messageId: "unbounded",
                                data: { kind: node.callee.property.name },
                            });
                        }
                    });
                }
            },
        };
    },
};
