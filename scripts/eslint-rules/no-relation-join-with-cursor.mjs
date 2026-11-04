// Prisma silently ignores `relationLoadStrategy: "join"` when a `cursor` is
// present (prisma/prisma#23564). Counts a cursor set directly or spread in via
// `...(cursor ? { cursor } : {})`. Ported from tolmete-api.
const isNamed = (property, name) =>
    property.type === "Property" &&
    !property.computed &&
    ((property.key.type === "Identifier" && property.key.name === name) ||
        (property.key.type === "Literal" && property.key.value === name));

const contributesCursor = (node) => {
    if (node?.type === "ObjectExpression") {
        return node.properties.some(
            (property) =>
                isNamed(property, "cursor") ||
                (property.type === "SpreadElement" &&
                    contributesCursor(property.argument))
        );
    }

    if (node?.type === "ConditionalExpression") {
        return (
            contributesCursor(node.consequent) ||
            contributesCursor(node.alternate)
        );
    }

    if (node?.type === "LogicalExpression") {
        return contributesCursor(node.left) || contributesCursor(node.right);
    }

    return false;
};

export default {
    meta: {
        type: "problem",
        schema: [],
        messages: {
            joinWithCursor:
                '`relationLoadStrategy: "join"` is a no-op when a `cursor` is present — Prisma falls back to the query strategy (prisma/prisma#23564). Drop the cursor or the join.',
        },
    },
    create(context) {
        return {
            CallExpression(node) {
                const [options] = node.arguments;

                if (
                    options?.type !== "ObjectExpression" ||
                    !contributesCursor(options)
                ) {
                    return;
                }

                const strategy = options.properties.find((property) =>
                    isNamed(property, "relationLoadStrategy")
                );

                if (
                    strategy?.value.type === "Literal" &&
                    strategy.value.value === "join"
                ) {
                    context.report({
                        node: strategy,
                        messageId: "joinWithCursor",
                    });
                }
            },
        };
    },
};
