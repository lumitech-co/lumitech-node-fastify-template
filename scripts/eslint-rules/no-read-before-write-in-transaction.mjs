/**
 * A transaction exists so writes can be rolled back. A read has nothing to roll
 * back, so a read before the first write is buying nothing and is what forces
 * the transaction to stay in the service — which is how `…InTx` method pairs
 * appear instead of one repository method that owns the whole block.
 *
 *   await prisma.$transaction(async (tx) => {
 *       const rows = await tx.member.findMany(…);   // hoist this out
 *       …decide…
 *       await tx.member.update(…);                  // the part worth a transaction
 *   });
 *
 * **The snapshot argument does not apply by default.** Prisma's interactive
 * transactions run at the connector default — `ReadCommitted` on Postgres — so
 * a plain read takes no locks and gives the later write no protection against
 * the row changing underneath it. A check-then-write race is closed by
 * re-checking the condition in the write's `where`, not by wrapping both.
 *
 * Where the guarantee IS wanted this codebase says so explicitly, and the rule
 * steps aside for exactly that: a callback whose `$transaction` call passes an
 * `isolationLevel`, or that takes a lock itself (`FOR UPDATE`, an advisory
 * lock), is not reported.
 *
 * Reads and writes are recognised on the transaction handle and on a repository
 * that is handed it, since after the data-access migration most blocks call
 * repositories rather than `tx.<model>` directly.
 *
 * KNOWN LIMIT: a repository call is classified by its name, so a writing method
 * whose name begins with a read verb reads as a read. `findOrCreate` is the case
 * that exists here. The report is then about the wrong statement, though the
 * question it raises — does this need the transaction at all — usually still has
 * the same answer. Judge the block, not the highlighted line.
 *
 * Ported from tolmete-api.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
const READ_METHOD =
    /^(findMany|findUnique|findFirst|findUniqueOrThrow|findFirstOrThrow|findUniqueOrFail|findFirstOrFail|count|aggregate|groupBy)$/;

const REPOSITORY_READ_PREFIX =
    /^(find|get|count|list|aggregate|resolve|load|search)/;

export default {
    meta: {
        type: "suggestion",
        docs: {
            description:
                "A read before the first write inside a transaction should happen before the transaction opens.",
        },
        messages: {
            readBeforeWrite:
                "This read runs before the transaction's first write, so the transaction is not protecting it — a transaction rolls writes back, and a read has nothing to roll back. Move it above `prisma.$transaction`; what is left is pure writes, which can move whole into a repository. If the read really needs the write's snapshot, say so with an `isolationLevel` or a lock — Prisma's default is ReadCommitted and takes none.",
        },
        schema: [],
    },

    create(context) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();

        const usesHandle = (node, handle) => {
            let found = false;

            const walk = (current) => {
                if (found || !current || typeof current.type !== "string") {
                    return;
                }

                if (current.type === "Identifier" && current.name === handle) {
                    found = true;

                    return;
                }

                for (const key of Object.keys(current)) {
                    if (key === "parent") {
                        continue;
                    }

                    const value = current[key];

                    if (Array.isArray(value)) {
                        value.forEach(walk);
                    } else if (value && typeof value.type === "string") {
                        walk(value);
                    }
                }
            };

            walk(node);

            return found;
        };

        return {
            CallExpression(node) {
                if (
                    node.callee.type !== "MemberExpression" ||
                    node.callee.object.type !== "Identifier" ||
                    node.callee.object.name !== "prisma" ||
                    node.callee.property.type !== "Identifier" ||
                    node.callee.property.name !== "$transaction"
                ) {
                    return;
                }

                // An explicit isolation level means the read IS part of the
                // guarantee — that is the sanctioned way to ask for one.
                if (
                    node.arguments[1]?.type === "ObjectExpression" &&
                    node.arguments[1].properties.some(
                        (property) =>
                            property.type === "Property" &&
                            property.key.type === "Identifier" &&
                            property.key.name === "isolationLevel"
                    )
                ) {
                    return;
                }

                const callback = node.arguments[0];

                if (
                    !callback ||
                    (callback.type !== "ArrowFunctionExpression" &&
                        callback.type !== "FunctionExpression") ||
                    callback.params[0]?.type !== "Identifier"
                ) {
                    return;
                }

                const handle = callback.params[0].name;
                const text = sourceCode.getText(callback);

                if (/FOR\s+UPDATE|pg_advisory/i.test(text)) {
                    return;
                }

                let firstRead = null;
                let firstWrite = Infinity;

                const visit = (current) => {
                    if (!current || typeof current.type !== "string") {
                        return;
                    }

                    if (
                        current.type === "CallExpression" &&
                        current.callee.type === "MemberExpression" &&
                        current.callee.property.type === "Identifier"
                    ) {
                        const method = current.callee.property.name;
                        const object = current.callee.object;

                        const onHandle =
                            (object.type === "MemberExpression" &&
                                object.object.type === "Identifier" &&
                                object.object.name === handle) ||
                            (object.type === "Identifier" &&
                                object.name === handle);

                        const onRepository =
                            object.type === "Identifier" &&
                            /Repository$/.test(object.name) &&
                            current.arguments.some((argument) =>
                                usesHandle(argument, handle)
                            );

                        if (onHandle || onRepository) {
                            const isRead = onHandle
                                ? READ_METHOD.test(method)
                                : REPOSITORY_READ_PREFIX.test(method);

                            if (isRead) {
                                if (
                                    firstRead === null ||
                                    current.range[0] < firstRead.range[0]
                                ) {
                                    firstRead = current;
                                }
                            } else {
                                firstWrite = Math.min(
                                    firstWrite,
                                    current.range[0]
                                );
                            }
                        }
                    }

                    for (const key of Object.keys(current)) {
                        if (key === "parent") {
                            continue;
                        }

                        const value = current[key];

                        if (Array.isArray(value)) {
                            value.forEach(visit);
                        } else if (value && typeof value.type === "string") {
                            visit(value);
                        }
                    }
                };

                visit(callback.body);

                if (
                    firstRead !== null &&
                    firstWrite !== Infinity &&
                    firstRead.range[0] < firstWrite
                ) {
                    context.report({
                        node: firstRead,
                        messageId: "readBeforeWrite",
                    });
                }
            },
        };
    },
};
