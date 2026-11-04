// Comments are not AST nodes, so no-restricted-syntax cannot see them.
// Consecutive // lines count as one comment.
export const MAX_COMMENT_LINES = 5;

export default {
    meta: {
        type: "suggestion",
        schema: [
            {
                type: "object",
                properties: { max: { type: "integer", minimum: 1 } },
                additionalProperties: false,
            },
        ],
        messages: {
            tooLong:
                "Comment spans {{lines}} lines (max {{max}}) — long explanations belong in a .md file (module README.md or ARCHITECTURE.md).",
        },
    },
    create(context) {
        const max = context.options[0]?.max ?? MAX_COMMENT_LINES;

        return {
            Program() {
                const { sourceCode } = context;
                const blocks = [];

                for (const comment of sourceCode.getAllComments()) {
                    const previous = blocks.at(-1);

                    const ownLine =
                        comment.type === "Line" &&
                        sourceCode.lines[comment.loc.start.line - 1]
                            .trim()
                            .startsWith("//");

                    if (
                        ownLine &&
                        previous?.ownLine &&
                        comment.loc.start.line === previous.loc.end.line + 1
                    ) {
                        previous.loc = {
                            start: previous.loc.start,
                            end: comment.loc.end,
                        };
                    } else {
                        blocks.push({ ownLine, loc: comment.loc });
                    }
                }

                for (const { loc } of blocks) {
                    const lines = loc.end.line - loc.start.line + 1;

                    if (lines > max) {
                        context.report({
                            loc,
                            messageId: "tooLong",
                            data: { lines, max },
                        });
                    }
                }
            },
        };
    },
};
