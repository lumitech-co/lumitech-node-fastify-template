/**
 * Claude Code PostToolUse hook (Write/Edit/MultiEdit): lints the edited file
 * and hands any problem back to Claude, so a rule violation is fixed right
 * away instead of at commit time.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const LINTED = /^(src|test|scripts|cli)\/.+\.(ts|js|mjs)$/;

const input = JSON.parse(fs.readFileSync(0, "utf8"));
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const filePath = input.tool_input?.file_path ?? input.tool_response?.filePath;

const relative =
    typeof filePath === "string"
        ? path
              .relative(root, path.resolve(root, filePath))
              .replaceAll("\\", "/")
        : "";

if (LINTED.test(relative) && fs.existsSync(path.join(root, relative))) {
    const result = spawnSync(
        process.execPath,
        [
            path.join(root, "node_modules/eslint/bin/eslint.js"),
            "--max-warnings",
            "0",
            relative,
        ],
        { cwd: root, encoding: "utf8" }
    );

    if (result.status !== 0) {
        process.stdout.write(
            JSON.stringify({
                decision: "block",
                reason: `ESLint found problems in ${relative} — fix them (CLAUDE.md rules), never disable the check:\n${result.stdout}${result.stderr}`,
            })
        );
    }
}
