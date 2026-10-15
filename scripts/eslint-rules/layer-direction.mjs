// lib/ and database/ never reach up into modules/; a module reaches another
// module only for types — the rest comes through the container.
export default {
    meta: {
        type: "problem",
        schema: [],
        messages: {
            upward: "src/lib and src/database never import from src/modules (CLAUDE.md, Rule 1).",
            crossModule:
                "A module imports another module only with `import type` — inject its service through the Awilix container (CLAUDE.md, Rule 1).",
        },
    },
    create(context) {
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

            const typeOnly =
                node.importKind === "type" ||
                (node.specifiers?.length > 0 &&
                    node.specifiers.every(
                        (spec) => spec.importKind === "type"
                    ));

            if (target !== ownModule && !typeOnly) {
                context.report({ node, messageId: "crossModule" });
            }
        }

        return { ImportDeclaration: check, ImportExpression: check };
    },
};
