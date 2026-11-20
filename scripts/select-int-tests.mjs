/**
 * Prints (or with `--run`, runs) the integration tests the current branch needs.
 *   node scripts/select-int-tests.mjs [--base origin/HEAD] [--format github] [--run]
 * Rules: int-test-selection.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { selectIntTests } from "./int-test-selection.mjs";
import { execFileSync, spawnSync } from "node:child_process";

const arg = (flag) => {
    const index = process.argv.indexOf(flag);

    return index === -1 ? undefined : process.argv[index + 1];
};

const root = path.resolve(import.meta.dirname, "..");
// The remote's default branch, whatever it is called; CI passes --base explicitly.
const base = arg("--base") ?? "origin/HEAD";
const format = arg("--format") ?? "plain";

const git = (args) =>
    execFileSync("git", args, { encoding: "utf8", cwd: root })
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

const changedFiles = [
    ...new Set([
        // --no-renames lists both paths of a move, so a file leaving shared code
        // still counts as a change to shared code.
        ...git(["diff", "--name-only", "--no-renames", `${base}...HEAD`]),
        ...git(["diff", "--name-only", "--no-renames", "HEAD"]),
        ...git(["ls-files", "--others", "--exclude-standard"]),
    ]),
];

const hasIntTests = (dir) =>
    fs.existsSync(path.join(root, dir)) &&
    fs
        .readdirSync(path.join(root, dir), { recursive: true })
        .some((entry) => String(entry).endsWith(".test.ts"));

const { targets, runAll, reason } = selectIntTests({
    changedFiles,
    hasIntTests,
});

const run = runAll || targets.length > 0;

if (format === "github") {
    const oneLine = (value) => value.replace(/[\r\n]+/g, " ");

    process.stdout.write(
        `run=${run}\ntargets=${oneLine(targets.join(" "))}\nreason=${oneLine(reason)}\n`
    );
} else {
    process.stdout.write(
        `${run ? (runAll ? "ALL" : targets.join(" ")) : "NONE"} (${reason})\n`
    );
}

if (process.argv.includes("--run") && run) {
    const result = spawnSync("npm", ["run", "test:int:ci", "--", ...targets], {
        stdio: "inherit",
        cwd: root,
        shell: process.platform === "win32",
    });

    process.exit(result.status ?? 1);
}
