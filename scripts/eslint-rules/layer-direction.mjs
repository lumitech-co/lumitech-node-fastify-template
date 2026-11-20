// lib/ and database/ never reach up into modules/; a module reaches another
// module only through that module's public.ts, and only for types — the
// rest comes through the container. The module is the first folder under
// src/modules/, so the submodules of one module import each other freely.
//
// Optional `order`: module names, most basic first. A listed module may
// import only listed modules above it, so the modules cannot form a cycle.
// A module missing from the list is not ordered.
export default {
    meta: {
        type: "problem",
        schema: [
            {
                type: "object",
                properties: {
                    order: { type: "array", items: { type: "string" } },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            upward: "src/lib and src/database never import from src/modules (CLAUDE.md, Rule 1).",
            crossModule:
                "A module imports another module only with `import type` — inject its service through the Awilix container (CLAUDE.md, Rule 1).",
            publicApi:
                "Import another module only from its public API: @/modules/{{target}}/public.js (CLAUDE.md, Rule 1).",
            order: "{{own}} may import only modules listed above it — {{target}} is below (CLAUDE.md, Rule 1).",
        },
    },
    create(context) {
        const order = context.options[0]?.order ?? [];
        const file = context.filename.replaceAll("\\", "/");
        const ownModule = file.match(/\/src\/modules\/([^/]+)\//)?.[1];
        const lowerLayer = /\/src\/(lib|database)\//.test(file);

        if (!ownModule && !lowerLayer) {
            return {};
        }

        function check(node) {
            const source = node.source?.value;

            const target =
                typeof source === "string" &&
                source.match(/^@\/modules\/([^/]+)\//)?.[1];

            if (!target) {
                return;
            }

            if (lowerLayer) {
                context.report({ node, messageId: "upward" });

                return;
            }

            if (target === ownModule) {
                return;
            }

            if (source !== `@/modules/${target}/public.js`) {
                context.report({
                    node,
                    messageId: "publicApi",
                    data: { target },
                });
            }

            const typeOnly =
                node.importKind === "type" ||
                (node.specifiers?.length > 0 &&
                    node.specifiers.every(
                        (spec) => spec.importKind === "type"
                    ));

            if (!typeOnly) {
                context.report({ node, messageId: "crossModule" });
            }

            const ownRank = order.indexOf(ownModule);
            const targetRank = order.indexOf(target);

            if (ownRank !== -1 && targetRank > ownRank) {
                context.report({
                    node,
                    messageId: "order",
                    data: { own: ownModule, target },
                });
            }
        }

        return { ImportDeclaration: check, ImportExpression: check };
    },
};
