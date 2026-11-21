import fs from "node:fs";

// A copied module keeps its old file names; globs can't compare a file name
// with its folder, so this does.
//
// The folder that names a file is its unit: a flat module
// (src/modules/<module>/) or a submodule (src/modules/<module>/<submodule>/).
// mq/ is never a unit: its files are named after the unit above it.
//
// Below its unit a module may sort files into internal folders
// (src/modules/<module>/[<submodule>/]<folder>/...). They hold code only:
// no index.ts (autoload would mount it), routes, handlers, repositories or
// mq/, which stay in the unit itself. Their file names are not checked.
const NAMED_FOLDERS =
    /^(.*\/src\/)(modules|lib\/validation|plugins\/mq)\/(.+)$/;

// Depth of a unit below src/modules/: <module>/ or <module>/<submodule>/.
const UNIT_DEPTH = { flat: 1, grouped: 2 };

const UNIT_ONLY_FILE =
    /^(index\.ts|.+\.(route|handler)\.ts|.+\.repository(\..+)?\.ts)$/;

// A module root with its own index.ts is a flat module; otherwise it groups
// submodules (the same test as the architecture tests and the generators).
const isFlatModule = (src, module) =>
    fs.existsSync(`${src}modules/${module}/index.ts`);

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
            internal:
                "{{folder}}/ is an internal folder of {{unit}}/: index.ts, routes, handlers, repositories and mq/ stay in {{unit}}/ itself (ARCHITECTURE.md, Internal folders).",
        },
    },
    create(context) {
        const match = context.filename
            .replaceAll("\\", "/")
            .match(NAMED_FOLDERS);

        if (!match) {
            return {};
        }

        const [, src, root, rest] = match;
        const dirs = rest.split("/");
        const file = dirs.pop();
        const inMq = dirs.at(-1) === "mq";

        if (inMq) {
            dirs.pop();
        }

        if (dirs.length === 0) {
            return {};
        }

        const unitDepth =
            root === "modules" && !isFlatModule(src, dirs[0])
                ? UNIT_DEPTH.grouped
                : UNIT_DEPTH.flat;

        if (dirs.length <= unitDepth) {
            return checkName({ context, folder: dirs.at(-1), inMq, file });
        }

        // Deeper nesting outside src/modules is arch/file-layout's to report.
        if (root !== "modules") {
            return {};
        }

        const unit = dirs[unitDepth - 1];
        const internal = dirs.slice(unitDepth);

        if (!inMq && !internal.includes("mq") && !UNIT_ONLY_FILE.test(file)) {
            return {};
        }

        return {
            Program(node) {
                context.report({
                    node,
                    messageId: "internal",
                    data: { folder: internal.join("/"), unit },
                });
            },
        };
    },
};

function checkName({ context, folder, inMq, file }) {
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
}
