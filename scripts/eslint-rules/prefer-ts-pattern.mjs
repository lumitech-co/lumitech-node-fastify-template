/**
 * Flags a `switch` and an `if / else if` chain that tests one discriminant
 * against literals: use `match()` from ts-pattern. Not auto-fixable. A `switch`
 * with a `never` default and a chain with any other test are left alone.
 *
 * @type {import("eslint").Rule.RuleModule}
 */

// A literal, a negative number or `Enum.Member`. The PascalCase object tells
// `Role.Admin` (a pattern) from `opts.first` (a runtime value) without types.
const isLiteralValue = (node) =>
    node.type === "Literal" ||
    (node.type === "MemberExpression" &&
        !node.computed &&
        node.object.type === "Identifier" &&
        /^[A-Z]/.test(node.object.name)) ||
    (node.type === "UnaryExpression" &&
        node.operator === "-" &&
        node.argument.type === "Literal");

// A `never` default already fails to compile on a new union member;
// `.otherwise()` would lose that check.
const hasExhaustivenessGuard = (switchStatement) => {
    const defaultCase = switchStatement.cases.find((one) => one.test === null);

    if (!defaultCase) {
        return false;
    }

    const seek = (node) => {
        if (!node || typeof node.type !== "string") {
            return false;
        }

        if (node.type === "TSNeverKeyword") {
            return true;
        }

        if (
            node.type === "CallExpression" &&
            node.callee.type === "Identifier" &&
            /^(assertNever|assertUnreachable|exhaustive)/i.test(
                node.callee.name
            )
        ) {
            return true;
        }

        return Object.keys(node).some((key) => {
            if (key === "parent") {
                return false;
            }

            const value = node[key];

            if (Array.isArray(value)) {
                return value.some(seek);
            }

            return value && typeof value.type === "string"
                ? seek(value)
                : false;
        });
    };

    return defaultCase.consequent.some(seek);
};

// `A === B` / `A == B` → the two sides + their source text; else null.
const asEqualityTest = (test, sourceCode) => {
    if (
        test.type !== "BinaryExpression" ||
        (test.operator !== "===" && test.operator !== "==")
    ) {
        return null;
    }

    return {
        left: test.left,
        right: test.right,
        leftText: sourceCode.getText(test.left),
        rightText: sourceCode.getText(test.right),
    };
};

// The tests of an `if / else if` chain; null when one is not an equality.
const collectChain = (head, sourceCode) => {
    const tests = [];

    for (
        let current = head;
        current && current.type === "IfStatement";
        current = current.alternate
    ) {
        const equality = asEqualityTest(current.test, sourceCode);

        if (!equality) {
            return null;
        }

        tests.push(equality);
    }

    return tests;
};

// A variable or `obj.prop`; not `typeof x`, a call or computed access.
const isDiscriminantShape = (node) =>
    node.type === "Identifier" ||
    (node.type === "MemberExpression" && !node.computed);

// A lone `if/else` is not worth a match.
const MIN_DISCRIMINANT_BRANCHES = 2;

// The source text of the side identical in all tests, when the other side is a
// varying literal; else null.
const resolveDiscriminant = (tests) => {
    if (tests.length < MIN_DISCRIMINANT_BRANCHES) {
        return null;
    }

    for (const side of ["left", "right"]) {
        const value = side === "left" ? "right" : "left";
        const discriminantText = tests[0][`${side}Text`];

        const sameDiscriminant = tests.every(
            (test) => test[`${side}Text`] === discriminantText
        );

        const discriminantIsShape = isDiscriminantShape(tests[0][side]);

        const valuesAreLiterals = tests.every((test) =>
            isLiteralValue(test[value])
        );

        const valuesVary =
            new Set(tests.map((test) => test[`${value}Text`])).size > 1;

        if (
            sameDiscriminant &&
            discriminantIsShape &&
            valuesAreLiterals &&
            valuesVary
        ) {
            return discriminantText;
        }
    }

    return null;
};

// True unless this `if` is the `else if` of another — so a chain reports once.
const isChainHead = (node) =>
    !(node.parent?.type === "IfStatement" && node.parent.alternate === node);

export default {
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Prefer the `ts-pattern` `match()` over `switch` and single-discriminant `if/else-if` chains.",
        },
        messages: {
            preferMatchSwitch:
                "Prefer ts-pattern `match(...)` over `switch` — it gives expression-style, exhaustively-checked matching (`.exhaustive()`). Convert by hand to `match(value).with(...).exhaustive()`.",
            preferMatchIfChain:
                "This if/else-if chain matches `{{discriminant}}` against literals — prefer ts-pattern `match({{discriminant}})` with `.with(...)` / `.exhaustive()`.",
        },
        schema: [],
    },

    create(context) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();

        return {
            SwitchStatement(node) {
                if (hasExhaustivenessGuard(node)) {
                    return;
                }

                context.report({
                    node,
                    loc: sourceCode.getFirstToken(node).loc,
                    messageId: "preferMatchSwitch",
                });
            },

            IfStatement(node) {
                if (!isChainHead(node)) {
                    return;
                }

                const tests = collectChain(node, sourceCode);

                if (!tests) {
                    return;
                }

                const discriminant = resolveDiscriminant(tests);

                if (!discriminant) {
                    return;
                }

                context.report({
                    node,
                    loc: sourceCode.getFirstToken(node).loc,
                    messageId: "preferMatchIfChain",
                    data: { discriminant },
                });
            },
        };
    },
};
