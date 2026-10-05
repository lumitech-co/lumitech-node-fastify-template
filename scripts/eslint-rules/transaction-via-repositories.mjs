// Rule 2: a service may open prisma.$transaction, but the transaction client
// is only handed to repository methods — never queried in place.
export default {
    meta: {
        type: "problem",
        schema: [],
        messages: {
            direct: "Inside $transaction, pass `{{name}}` to a repository method — queries still go through repositories (CLAUDE.md, Rule 2).",
        },
    },
    create(context) {
        const clients = [];

        function clientOf(node) {
            const [callback] = node.arguments;

            const param = /Function/.test(callback?.type ?? "")
                ? callback.params[0]
                : null;

            return param?.type === "Identifier" ? param.name : null;
        }

        return {
            "CallExpression[callee.property.name='$transaction']"(node) {
                clients.push(clientOf(node));
            },
            "CallExpression[callee.property.name='$transaction']:exit"() {
                clients.pop();
            },
            MemberExpression(node) {
                if (
                    node.object.type === "Identifier" &&
                    clients.includes(node.object.name)
                ) {
                    context.report({
                        node,
                        messageId: "direct",
                        data: { name: node.object.name },
                    });
                }
            },
        };
    },
};
