// Flags >=2 reads on the same *Repository with a text-identical `where` on one
// execution path: fetch the rows once and derive the rest in memory. A write
// or an early exit splits the path; count/exists and cursor reads never count.
// Ported from tolmete-api.
const isRepositoryReceiver = (node) => {
    if (node.type === "Identifier") {
        return /Repository$/.test(node.name);
    }

    if (
        node.type === "MemberExpression" &&
        node.property.type === "Identifier"
    ) {
        return /Repository$/.test(node.property.name);
    }

    return false;
};

// A row-returning read, by naming convention. `count`/`exists` are excluded so
// the find+count pagination pair does not read as a duplicate.
const isReadMethod = (name) =>
    /^(find|get|list|search)/.test(name) ||
    name === "groupBy" ||
    name === "aggregate";

const isDatabaseName = (name) =>
    /Repository$/.test(name) || name === "prisma" || name === "tx";

// Does this receiver denote the database — a `*Repository`, or a `prisma` / `tx`
// client (`prisma.user`, `this.prisma`, `tx.member`)?
const isDatabaseReceiver = (node) => {
    let current = node;

    while (current) {
        if (current.type === "Identifier") {
            return isDatabaseName(current.name);
        }

        if (
            current.type !== "MemberExpression" ||
            current.property.type !== "Identifier"
        ) {
            return false;
        }

        if (isDatabaseName(current.property.name)) {
            return true;
        }

        current = current.object;
    }

    return false;
};

// A write, by naming convention. `$transaction` / `$execute*` cover Prisma's
// transactional and raw-mutation entry points. The receiver must be the database:
// `cache.delete(k)` / `map.delete(k)` / `queue.create(j)` are not DB writes, and
// matching them let an unrelated method name silently switch the rule off for the
// rest of the block (a real duplicate right after went unreported).
const isWriteCall = (node) =>
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    node.callee.property.type === "Identifier" &&
    (/^(create|update|delete|upsert)/.test(node.callee.property.name) ||
        node.callee.property.name === "$transaction" ||
        /^\$execute/.test(node.callee.property.name)) &&
    isDatabaseReceiver(node.callee.object);

const CONTROL_FLOW_EXITS = new Set([
    "ReturnStatement",
    "ThrowStatement",
    "BreakStatement",
    "ContinueStatement",
]);

const FUNCTION_NODE_TYPES = new Set([
    "FunctionDeclaration",
    "FunctionExpression",
    "ArrowFunctionExpression",
]);

const isBlockScope = (node) =>
    node.type === "BlockStatement" || FUNCTION_NODE_TYPES.has(node.type);

// The named (non-computed) property of an options object, or undefined.
const findProperty = (objectExpression, name) =>
    objectExpression.properties.find(
        (property) =>
            property.type === "Property" &&
            !property.computed &&
            ((property.key.type === "Identifier" &&
                property.key.name === name) ||
                (property.key.type === "Literal" &&
                    property.key.value === name))
    );

// `<receiver>.<readMethod>({ where: … })` → its receiver + where text, else null.
const asRepositoryRead = (node, sourceCode) => {
    if (
        node.type !== "CallExpression" ||
        node.callee.type !== "MemberExpression" ||
        node.callee.property.type !== "Identifier" ||
        !isReadMethod(node.callee.property.name) ||
        !isRepositoryReceiver(node.callee.object)
    ) {
        return null;
    }

    const arg = node.arguments[0];

    if (!arg || arg.type !== "ObjectExpression") {
        return null;
    }

    // Cursor-based reads (prev/next neighbor, keyset pagination) intentionally
    // fetch DIFFERENT rows despite an identical `where` — never a duplicate.
    if (findProperty(arg, "cursor")) {
        return null;
    }

    const whereProperty = findProperty(arg, "where");

    if (!whereProperty) {
        return null;
    }

    return {
        receiverText: sourceCode.getText(node.callee.object),
        whereText: sourceCode.getText(whereProperty.value),
        method: node.callee.property,
    };
};

// Depth-first walk of `node`'s subtree calling `visit` on each node, not
// descending into any node for which `skipInto` is true (the node itself is
// still visited).
const walk = (node, visit, skipInto) => {
    if (!node || typeof node.type !== "string") {
        return;
    }

    visit(node);

    if (skipInto(node)) {
        return;
    }

    for (const key of Object.keys(node)) {
        if (key === "parent") {
            continue;
        }

        const value = node[key];

        if (Array.isArray(value)) {
            for (const child of value) {
                walk(child, visit, skipInto);
            }
        } else if (value && typeof value.type === "string") {
            walk(value, visit, skipInto);
        }
    }
};

// Which parts of a branching expression always run, and which run only on some
// paths: a ternary's test always runs and its arms are alternatives; the
// left-hand side of `&&` / `||` / `??` always runs and the right-hand side is
// conditional on it. Returns null for everything else.
const splitBranchingExpression = (node) => {
    if (node.type === "ConditionalExpression") {
        return {
            always: [node.test],
            conditional: [node.consequent, node.alternate],
        };
    }

    if (node.type === "LogicalExpression") {
        return { always: [node.left], conditional: [node.right] };
    }

    return null;
};

// Reads on `statement`'s own unconditional path, plus the conditional sub-paths
// to scan separately. Nested blocks and functions are their own scopes; a
// conditional path is its own execution, so two reads on sibling paths (a
// ternary's arms, or `findFirst(…) || findFirst(…)`) are never the same read
// twice — only one of them runs.
const collectOwnReads = (statement, sourceCode) => {
    const reads = [];
    const conditionalPaths = [];

    walk(
        statement,
        (node) => {
            const read = asRepositoryRead(node, sourceCode);

            if (read) {
                reads.push(read);
            }
        },
        (node) => {
            if (node !== statement && isBlockScope(node)) {
                return true;
            }

            const branching = splitBranchingExpression(node);

            if (!branching) {
                return false;
            }

            for (const part of branching.always) {
                const nested = collectOwnReads(part, sourceCode);

                reads.push(...nested.reads);
                conditionalPaths.push(...nested.conditionalPaths);
            }

            conditionalPaths.push(...branching.conditional);

            return true;
        }
    );

    return { reads, conditionalPaths };
};

// Does executing `statement` end the current segment? True if it can mutate the
// DB or divert control flow. Nested functions are not our control flow, so they
// are not scanned.
const isBarrierStatement = (statement) => {
    let barrier = false;

    walk(
        statement,
        (node) => {
            if (CONTROL_FLOW_EXITS.has(node.type) || isWriteCall(node)) {
                barrier = true;
            }
        },
        (node) => node !== statement && FUNCTION_NODE_TYPES.has(node.type)
    );

    return barrier;
};

const MIN_DUPLICATE_READS = 2;

export default {
    meta: {
        type: "suggestion",
        messages: {
            duplicateWhereRead:
                '`{{receiver}}` is read {{count}} times with an identical `where` in this scope — fetch the rows once and derive the rest in memory (or one `relationLoadStrategy:"join"` read) instead of re-querying.',
        },
        schema: [],
    },

    create(context) {
        const { sourceCode } = context;

        const report = (segment) => {
            for (const reads of segment.values()) {
                if (reads.length < MIN_DUPLICATE_READS) {
                    continue;
                }

                for (const read of reads) {
                    context.report({
                        node: read.method,
                        messageId: "duplicateWhereRead",
                        data: {
                            receiver: read.receiverText,
                            count: String(reads.length),
                        },
                    });
                }
            }
        };

        const addTo = (segment, read) => {
            const key = `${read.receiverText}::${read.whereText}`;
            const reads = segment.get(key) ?? [];

            reads.push(read);
            segment.set(key, reads);
        };

        // One conditional path (a ternary arm, the right of `&&`/`||`) as its own
        // isolated segment: a duplicate *within* the path is still a duplicate,
        // but it never groups with a sibling path or the surrounding code.
        const processConditionalPath = (node) => {
            const { reads, conditionalPaths } = collectOwnReads(
                node,
                sourceCode
            );

            const segment = new Map();

            for (const read of reads) {
                addTo(segment, read);
            }

            report(segment);

            for (const path of conditionalPaths) {
                processConditionalPath(path);
            }
        };

        // Walk a block's direct statements in order, grouping reads within a
        // segment and flushing (reporting groups ≥2) at every barrier — so reads
        // separated by a write or an early exit never group.
        const processBlock = (statements) => {
            let segment = new Map();

            const flush = () => {
                report(segment);
                segment = new Map();
            };

            for (const statement of statements) {
                const { reads, conditionalPaths } = collectOwnReads(
                    statement,
                    sourceCode
                );

                for (const read of reads) {
                    addTo(segment, read);
                }

                for (const path of conditionalPaths) {
                    processConditionalPath(path);
                }

                if (isBarrierStatement(statement)) {
                    flush();
                }
            }

            flush();
        };

        return {
            "Program:exit": (node) => processBlock(node.body),
            "BlockStatement:exit": (node) => processBlock(node.body),
            "SwitchCase:exit": (node) => processBlock(node.consequent),
        };
    },
};
