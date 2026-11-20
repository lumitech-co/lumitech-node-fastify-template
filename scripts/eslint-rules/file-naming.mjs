// A copied module keeps its old file names; globs can't compare a file name
// with its folder, so this does.
//
// The folder that names a file is its unit: a flat module
// (src/modules/<module>/) or a submodule (src/modules/<module>/<submodule>/).
// mq/ is never a unit: its files are named after the unit above it.
const NAMED_FOLDERS = /\/src\/(modules|lib\/validation|plugins\/mq)\/(.+)$/;

const MAX_UNIT_DEPTH = { modules: 2, "lib/validation": 1, "plugins/mq": 1 };

// A module may own repositories for several models: <entity>.repository.ts.
const isUnnamedFile = ({ inMq, file }) =>
    file === "index.ts" ||
    file === "public.ts" ||
    (!inMq && file.endsWith(".repository.ts"));

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

        const [, root, rest] = match;
        const dirs = rest.split("/");
        const file = dirs.pop();
        const inMq = dirs.at(-1) === "mq";

        if (inMq) {
            dirs.pop();
        }

        // Deeper nesting is arch/file-layout's to report, not a naming question.
        if (dirs.length === 0 || dirs.length > MAX_UNIT_DEPTH[root]) {
            return {};
        }

        const folder = dirs.at(-1);

        return {
            Program(node) {
                if (
                    !isUnnamedFile({ inMq, file }) &&
                    !file.startsWith(`${folder}.`)
                ) {
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
