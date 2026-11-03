/**
 * A `let` shared by several tests may be assigned in a hook, never inside one
 * test and used in another: that test then passes only after the first ran
 * (ARCHITECTURE.md, Writing integration tests).
 */

const TEST_CALLS = new Set(["it", "test"]);

const rootName = (callee) => {
    let node = callee;

    while (
        node?.type === "MemberExpression" ||
        node?.type === "CallExpression"
    ) {
        node = node.type === "MemberExpression" ? node.object : node.callee;
    }

    return node?.type === "Identifier" ? node.name : null;
};

const enclosingTest = (node) => {
    for (let current = node.parent; current; current = current.parent) {
        const isTestCallback =
            (current.type === "ArrowFunctionExpression" ||
                current.type === "FunctionExpression") &&
            current.parent?.type === "CallExpression" &&
            current.parent.arguments.includes(current) &&
            TEST_CALLS.has(rootName(current.parent.callee));

        if (isTestCallback) {
            return current;
        }
    }

    return null;
};

export default {
    meta: {
        type: "problem",
        docs: {
            description:
                "Forbid a shared `let` assigned in one test and used in another.",
        },
        messages: {
            crossTest:
                "`{{name}}` is assigned in one test and used in another, so that test depends on this one having run first. Assign it in beforeEach, or declare it inside the test that uses it.",
        },
        schema: [],
    },

    create(context) {
        return {
            "Program:exit"() {
                for (const scope of context.sourceCode.scopeManager.scopes) {
                    for (const variable of scope.variables) {
                        const [definition] = variable.defs;

                        if (
                            definition?.type !== "Variable" ||
                            definition.parent.kind !== "let" ||
                            enclosingTest(definition.name)
                        ) {
                            continue;
                        }

                        const uses = variable.references.map((reference) => ({
                            reference,
                            test: enclosingTest(reference.identifier),
                        }));

                        for (const { reference, test } of uses) {
                            const usedElsewhere = uses.some(
                                (other) => other.test && other.test !== test
                            );

                            if (test && reference.isWrite() && usedElsewhere) {
                                context.report({
                                    node: reference.identifier,
                                    messageId: "crossTest",
                                    data: { name: variable.name },
                                });
                            }
                        }
                    }
                }
            },
        };
    },
};
