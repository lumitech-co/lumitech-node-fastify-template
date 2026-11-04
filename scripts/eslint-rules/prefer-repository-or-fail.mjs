// `const x = await xRepository.findById(...)` immediately followed by
// `if (!x) throw new NotFoundError(...)` belongs in the repository: give it a
// `…OrFail` method (the generator's `findByIdOrFail`) that throws itself.
const isRepositoryReceiver = (node) =>
    (node.type === "Identifier" && /Repository$/.test(node.name)) ||
    (node.type === "MemberExpression" &&
        node.property.type === "Identifier" &&
        /Repository$/.test(node.property.name));

const isNullableRead = (name) =>
    /^(find|get)/.test(name) && !/OrFail$/.test(name);

const repositoryRead = (declaration) => {
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
        !isNullableRead(call.callee.property.name) ||
        !isRepositoryReceiver(call.callee.object)
    ) {
        return null;
    }

    return {
        name: declarator.id.name,
        method: call.callee.property.name,
        node: call.callee.property,
    };
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
                "`{{method}}(...)` followed by `if (!{{name}}) throw new NotFoundError(...)` belongs in the repository — add a `…OrFail` method (like the generated `findByIdOrFail`) that throws the not-found error itself.",
        },
    },
    create(context) {
        return {
            VariableDeclaration(node) {
                const match = repositoryRead(node);
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
                        data: { name: match.name, method: match.method },
                    });
                }
            },
        };
    },
};
