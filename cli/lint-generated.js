import path from "path";
import { spawnSync } from "child_process";

// Generated imports are sorted by line length, which depends on the entity
// name, so the generators let ESLint fix what a static template cannot.
export const lintGenerated = (files) => {
    spawnSync(
        process.execPath,
        [
            path.join(process.cwd(), "node_modules/eslint/bin/eslint.js"),
            "--fix",
            ...files,
        ],
        { stdio: "inherit" }
    );
};
