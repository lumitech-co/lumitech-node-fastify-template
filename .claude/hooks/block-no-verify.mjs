// PreToolUse hook: refuse a git commit / push that skips the husky hooks
// (CLAUDE.md, "Never commit with --no-verify"). Message text — heredoc bodies
// and quoted strings with spaces — is stripped first, so a message that only
// mentions --no-verify passes; a quoted single token ("0", "-n") still counts.
import { pathToFileURL } from "node:url";

const HEREDOC = /<<-?\s*(['"]?)(\w+)\1[\s\S]*?^\s*\2\s*$/gm;
const QUOTED = /'[^']*'|"(?:\\.|[^"\\])*"/g;
const GIT_COMMIT_OR_PUSH = /\bgit\b[^;&|\n]*\b(commit|push)\b[^;&|\n]*/g;
const NO_VERIFY = /(^|[\s"'])--no-verify\b/;
const COMMIT_SHORT_N = /[\s"']-[a-mo-zA-Z]*n[a-zA-Z]*(?=[\s"']|$)/;
const HUSKY_OFF = /\bHUSKY\s*=\s*["']?0\b/;

const stripMessages = (command) =>
    command
        .replace(HEREDOC, "")
        .replace(QUOTED, (quoted) => (/\s/.test(quoted) ? '""' : quoted));

export const blockedReason = (command) => {
    const code = stripMessages(command);

    if (HUSKY_OFF.test(code)) {
        return "HUSKY=0 switches off every git hook";
    }

    for (const [invocation, verb] of code.matchAll(GIT_COMMIT_OR_PUSH)) {
        if (NO_VERIFY.test(invocation)) {
            return `git ${verb} --no-verify skips the husky hooks`;
        }

        if (/\bcore\.hooksPath\b/.test(invocation)) {
            return "overriding core.hooksPath skips the husky hooks";
        }

        if (verb === "commit" && COMMIT_SHORT_N.test(invocation)) {
            return "git commit -n is --no-verify";
        }
    }

    return null;
};

const readStdin = async () => {
    const chunks = [];

    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString("utf8");
};

const main = async () => {
    const input = JSON.parse(await readStdin());
    const reason = blockedReason(input.tool_input?.command ?? "");

    if (reason) {
        process.stdout.write(
            JSON.stringify({
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "deny",
                    permissionDecisionReason: `Blocked: ${reason}. Hooks run Prettier, eslint --fix --max-warnings 0, tsc and commitlint — the same gates as CI. Fix what they report and commit again (CLAUDE.md, Commands).`,
                },
            })
        );
    }

    return reason;
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    await main();
}
