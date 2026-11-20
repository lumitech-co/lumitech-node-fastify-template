// Connections held = concurrency × queries fired together, so one
// Promise.all / allSettled fires at most MAX_PARALLEL db calls.
const MAX_PARALLEL = 3;
const PARALLEL_COMBINATORS = new Set(["all", "allSettled", "race", "any"]);

const isDatabaseReceiver = (node) => {
    let current = node;

    while (current?.type === "MemberExpression") {
        current = current.object;
    }

    return (
        current?.type === "Identifier" &&
        (/Repository$/.test(current.name) ||
            current.name === "prisma" ||
            current.name === "tx")
    );
};

const isDatabaseCall = (node) => {
    const call = node?.type === "AwaitExpression" ? node.argument : node;

    return (
        call?.type === "CallExpression" &&
        call.callee.type === "MemberExpression" &&
        isDatabaseReceiver(call.callee.object)
    );
};

export default {
    meta: {
        type: "problem",
        schema: [],
        messages: {
            tooMany:
                "{{count}} database queries in one Promise.{{combinator}} — keep it to " +
                MAX_PARALLEL +
                " so concurrent workers stay inside the Prisma pool; run the rest as sequential awaits (CLAUDE.md, Rule 3).",
        },
    },
    create(context) {
        return {
            CallExpression(node) {
                const { callee } = node;
                const [items] = node.arguments;

                if (
                    callee.type !== "MemberExpression" ||
                    callee.object.type !== "Identifier" ||
                    callee.object.name !== "Promise" ||
                    !PARALLEL_COMBINATORS.has(callee.property.name) ||
                    items?.type !== "ArrayExpression"
                ) {
                    return;
                }

                const count = items.elements.filter(isDatabaseCall).length;

                if (count > MAX_PARALLEL) {
                    context.report({
                        node,
                        messageId: "tooMany",
                        data: { count, combinator: callee.property.name },
                    });
                }
            },
        };
    },
};
