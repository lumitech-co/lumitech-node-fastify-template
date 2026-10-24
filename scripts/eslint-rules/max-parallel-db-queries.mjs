// Workers and crons run at concurrency, so the connections a background task
// holds at once is (batch size) × (queries fired together) — that product, not
// a single slow query, exhausts the Prisma pool. One Promise.all/allSettled
// may fire at most MAX_PARALLEL repository / prisma / tx calls; past that, run
// them as sequential awaits or chunk them. Ported from tolmete-api's rule of 3.
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
