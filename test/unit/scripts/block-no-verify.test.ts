/**
 * The Claude Code hook in .claude/hooks/block-no-verify.mjs, run the way Claude
 * Code runs it (JSON on stdin): every way to skip the husky hooks is denied,
 * and a message that only mentions them is not.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

const HOOK = path.join(
    process.cwd(),
    ".claude",
    "hooks",
    "block-no-verify.mjs"
);

const decisionFor = (command: string): string | undefined => {
    const result = spawnSync(process.execPath, [HOOK], {
        input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
        encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);

    return result.stdout
        ? JSON.parse(result.stdout).hookSpecificOutput.permissionDecision
        : undefined;
};

const BLOCKED = [
    'git commit --no-verify -m "feat: x"',
    'git commit -m "feat: x" --no-verify',
    'git commit -n -m "feat: x"',
    'git commit -nm "feat: x"',
    'git commit "--no-verify" -m "feat: x"',
    'git add . && git commit -an -m "feat: x"',
    "git push --no-verify",
    "git push origin main --no-verify",
    'HUSKY=0 git commit -m "feat: x"',
    'export HUSKY=0; git commit -m "feat: x"',
    '$env:HUSKY = "0"; git commit -m "feat: x"',
    'git -c core.hooksPath=/dev/null commit -m "feat: x"',
];

const ALLOWED = [
    'git commit -m "feat: x"',
    'git commit -am "feat: x"',
    "git commit --amend --no-edit",
    'git commit -m "docs: never use --no-verify or -n"',
    "git commit -m \"$(cat <<'EOF'\nchore: explain --no-verify\n\nHUSKY=0 is banned\nEOF\n)\"",
    "git commit -F - <<'EOF'\nfix: drop the -n flag\nEOF",
    "git push -n origin main",
    "git push origin main",
    "git status && git log -n 5",
    "npm run lint",
];

describe("block-no-verify hook", () => {
    it.each(BLOCKED)("denies: %s", (command) => {
        expect(decisionFor(command)).toBe("deny");
    });

    it.each(ALLOWED)("allows: %s", (command) => {
        expect(decisionFor(command)).toBeUndefined();
    });
});
