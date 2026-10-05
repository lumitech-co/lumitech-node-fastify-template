// `const x = await xRepository.findUnique(...)` immediately followed by
// `if (!x) throw new NotFoundError(...)` is what findUniqueOrFail already does.
// Ported from tolmete-api; only findUnique, since the template's repositories
// generate findUniqueOrFail and nothing for findFirst.
const isRepositoryReceiver = (node) =>
    (node.type === "Identifier" && /Repository$/.test(node.name)) ||
    (node.type === "MemberExpression" &&
        node.property.type === "Identifier" &&
        /Repository$/.test(node.property.name));

const findUniqueCall = (declaration) => {
    const [declarator] = declaration.declarations;

    if (
        declaration.declarations.length !== 1 ||
        declarator.id.type !== "Identifier" ||
        declarator.init?.type !== "AwaitExpression"
    ) {
        return null;
    }

    const call = declarator.init.argument;

    if (
        call?.type !== "CallExpression" ||
        call.callee.type !== "MemberExpression" ||
        call.callee.property.type !== "Identifier" ||
        call.callee.property.name !== "findUnique" ||
        !isRepositoryReceiver(call.callee.object)
    ) {
        return null;
    }

    return { name: declarator.id.name, node: call.callee.property };
};

const isNull = (node) => node.type === "Literal" && node.value === null;

const isBinding = (node, name) =>
    node.type === "Identifier" && node.name === name;

const isNotFoundGuard = (test, name) =>
    (test.type === "UnaryExpression" &&
        test.operator === "!" &&
        isBinding(test.argument, name)) ||
    (test.type === "BinaryExpression" &&
        (test.operator === "===" || test.operator === "==") &&
        ((isBinding(test.left, name) && isNull(test.right)) ||
            (isBinding(test.right, name) && isNull(test.left))));

const throwsNotFound = (consequent) => {
    const first =
        consequent.type === "BlockStatement" ? consequent.body[0] : consequent;

    return (
        first?.type === "ThrowStatement" &&
        first.argument?.type === "NewExpression" &&
        first.argument.callee.type === "Identifier" &&
        first.argument.callee.name === "NotFoundError"
    );
};

const siblingsOf = (parent) => {
    if (parent?.type === "BlockStatement" || parent?.type === "Program") {
        return parent.body;
    }

    return parent?.type === "SwitchCase" ? parent.consequent : null;
};

export default {
    meta: {
        type: "suggestion",
        schema: [],
        messages: {
            preferOrFail:
                "Use `findUniqueOrFail(...)` instead of `findUnique(...)` followed by `if (!{{name}}) throw new NotFoundError(...)` — the repository throws the not-found error itself.",
        },
    },
    create(context) {
        return {
            VariableDeclaration(node) {
                const match = findUniqueCall(node);
                const siblings = match && siblingsOf(node.parent);

                if (!siblings) {
                    return;
                }

                const next = siblings[siblings.indexOf(node) + 1];

                if (
                    next?.type === "IfStatement" &&
                    isNotFoundGuard(next.test, match.name) &&
                    throwsNotFound(next.consequent)
                ) {
                    context.report({
                        node: match.node,
                        messageId: "preferOrFail",
                        data: { name: match.name },
                    });
                }
            },
        };
    },
};
