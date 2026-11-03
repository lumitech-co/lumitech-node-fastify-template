/**
 * Nudges `switch` statements and single-discriminant `if / else if` chains toward
 * the `ts-pattern` `match(...)` the template standardizes on. Ported from
 * tolmete-api. NOT auto-fixable: converting
 * control flow to `match().with().exhaustive()` is a human edit — guards,
 * per-branch side effects, and exhaustiveness intent don't mechanically
 * translate.
 *
 * A `switch` whose `default` asserts `never` is left alone: it already has a
 * compile-time exhaustiveness check, which `.otherwise()` would discard.
 *
 * An `if / else if` chain is flagged ONLY when every branch tests the SAME
 * discriminant against a literal / enum member with `===` / `==`:
 *   - the discriminant is the side whose source text is identical across all
 *     branches; the paired value side must be a Literal or an `Enum.Member`-shaped
 *     MemberExpression (or a negative numeric literal), and must vary;
 *   - at least one `else if` (≥2 comparisons) — a lone `if/else` isn't worth a match;
 *   - any branch that is not a clean `X === <literal>` — a `.includes()`, a
 *     relational `>`/`<`, `instanceof`, `typeof`, a logical `&&`/`||`, a bare
 *     truthiness check, or a different discriminant — disqualifies the WHOLE
 *     chain. Those are exactly the shapes that do not translate to a literal
 *     `match().with(...)`, so they must not be flagged.
 *
 * @type {import("eslint").Rule.RuleModule}
 */

// The "value" side of a discriminant comparison: a literal, an `Enum.Member`
// access, or a negative numeric literal. Deliberately excludes bare identifiers
// (could be a runtime variable, not a pattern) and deep/computed member access.
//
// `Enum.Member` is recognized by the PascalCase container the codebase uses for
// enums and const maps. Without type information `Role.Admin` and `opts.first`
// are the same shape, but only the former is a pattern `.with()` accepts — the
// latter is a runtime value that would have to become `.when()`. Requiring the
// uppercase initial keeps runtime lookups off the report.
const isLiteralValue = (node) =>
    node.type === "Literal" ||
    (node.type === "MemberExpression" &&
        !node.computed &&
        node.object.type === "Identifier" &&
        /^[A-Z]/.test(node.object.name)) ||
    (node.type === "UnaryExpression" &&
        node.operator === "-" &&
        node.argument.type === "Literal");

// Does the `default` clause assert exhaustiveness — `const _: never = x` or an
// `assertNever(x)`-style helper? Such a `switch` already fails to compile when a
// union member is added; `match().otherwise()` would silently accept it instead,
// so converting trades a compile-time guarantee for nothing. (`.exhaustive()`
// keeps it, but that is a rewrite this rule can't verify, so don't nag.)
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

// Walk the `if / else if` links from the head, collecting each test. Returns null
// if any link's test is not an equality comparison (a mixed chain is not a clean
// match). The trailing `else` block is not a test and ends the walk.
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

// A discriminant is a plain value being matched — a variable or `obj.prop` —
// NOT a `typeof x`, a call, or computed access (those are type-narrowing /
// dynamic, a different, judgment-call migration).
const isDiscriminantShape = (node) =>
    node.type === "Identifier" ||
    (node.type === "MemberExpression" && !node.computed);

// A lone `if/else` (one comparison) isn't worth a match — require at least one
// `else if`, i.e. two discriminant comparisons.
const MIN_DISCRIMINANT_BRANCHES = 2;

// One discriminant tested against varying literals across every branch → its
// source text; else null. The discriminant is the side identical in all tests;
// the other side must be literal-valued and must vary.
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
