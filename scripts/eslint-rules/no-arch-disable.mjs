// A blanket directive (no rule list) switches off every arch/* rule too.
const DISABLE_DIRECTIVE =
    /^\s*eslint-disable(?:-next-line|-line)?(?:\s+([^]*?))?(?:\s+--[^]*)?\s*$/;

export default {
    meta: {
        type: "problem",
        schema: [],
        messages: {
            archRule:
                "Never disable an arch/* rule — fix the code (CLAUDE.md, Architecture Rules).",
            blanket:
                "List the rules you disable — a blanket eslint-disable also switches off the arch/* rules.",
        },
    },
    create(context) {
        return {
            Program() {
                for (const comment of context.sourceCode.getAllComments()) {
                    const match = comment.value.match(DISABLE_DIRECTIVE);

                    if (!match) {
                        continue;
                    }

                    const rules = match[1]?.trim();

                    if (!rules) {
                        context.report({
                            loc: comment.loc,
                            messageId: "blanket",
                        });
                    } else if (/(^|[\s,])arch\//.test(rules)) {
                        context.report({
                            loc: comment.loc,
                            messageId: "archRule",
                        });
                    }
                }
            },
        };
    },
};
