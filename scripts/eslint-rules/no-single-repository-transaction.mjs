// A transaction that coordinates exactly one repository is that repository's
// operation: move it into one repository method that opens the transaction.
// Two or more repositories, or awaiting anything else, is real orchestration
// and stays in the service. Ported from tolmete-api.
const rootOf = (call) => {
    const callee = call?.type === "CallExpression" ? call.callee : null;

    if (
        callee?.type === "MemberExpression" &&
        callee.object.type === "Identifier"
    ) {
        return callee.object.name;
    }

    return callee?.type === "Identifier" ? callee.name : null;
};

const childrenOf = (node) =>
    Object.entries(node)
        .filter(([key]) => key !== "parent")
        .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
        .filter((child) => typeof child?.type === "string");

export default {
    meta: {
        type: "suggestion",
        schema: [],
        messages: {
            singleRepository:
                "This transaction only coordinates `{{repository}}` — move the whole block into it as one method that opens its own transaction (CLAUDE.md, Rule 2).",
        },
    },
    create(context) {
        return {
            "CallExpression[callee.object.name='prisma'][callee.property.name='$transaction']"(
                node
            ) {
                const [callback] = node.arguments;

                if (
                    !/^(Arrow)?FunctionExpression$/.test(
                        callback?.type ?? ""
                    ) ||
                    callback.params[0]?.type !== "Identifier"
                ) {
                    return;
                }

                const client = callback.params[0].name;
                const repositories = new Set();
                let disqualified = false;

                const visit = (current) => {
                    if (
                        current.type === "MemberExpression" &&
                        current.object.type === "Identifier" &&
                        current.object.name === client
                    ) {
                        disqualified = true;
                    }

                    if (current.type === "AwaitExpression") {
                        const root = rootOf(current.argument);

                        if (root && /Repository$/.test(root)) {
                            repositories.add(root);
                        } else if (
                            root &&
                            root !== client &&
                            root !== "Promise"
                        ) {
                            disqualified = true;
                        }
                    }

                    childrenOf(current).forEach(visit);
                };

                visit(callback.body);

                if (!disqualified && repositories.size === 1) {
                    context.report({
                        node: node.callee.property,
                        messageId: "singleRepository",
                        data: { repository: [...repositories][0] },
                    });
                }
            },
        };
    },
};
