// A copied module keeps its old file names; globs can't compare a file name
// with its folder, so this does.
const NAMED_FOLDERS =
    /\/src\/(?:modules|database\/repositories|lib\/validation|plugins\/mq)\/([^/]+)\/(?:mq\/)?([^/]+)$/;

export default {
    meta: {
        type: "problem",
        schema: [],
        messages: {
            mismatch:
                "Files in {{folder}}/ are named {{folder}}.<kind>.ts — rename this file or move it to its own folder (generators: CLAUDE.md, Rule 0).",
        },
    },
    create(context) {
        const match = context.filename
            .replaceAll("\\", "/")
            .match(NAMED_FOLDERS);

        if (!match) {
            return {};
        }

        const [, folder, file] = match;

        return {
            Program(node) {
                if (file !== "index.ts" && !file.startsWith(`${folder}.`)) {
                    context.report({
                        node,
                        messageId: "mismatch",
                        data: { folder },
                    });
                }
            },
        };
    },
};
