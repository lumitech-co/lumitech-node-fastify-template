/**
 * Claude Code PreToolUse hook (Write/Edit/MultiEdit). Rule 0: modules and
 * repositories are created by the generators; Rule 9: migrations by
 * `npm run prisma:migrate:create`. Editing generated files stays allowed.
 */
import fs from "node:fs";
import path from "node:path";

const MIGRATIONS = "src/database/prisma/migrations/";

const decide = (permissionDecision, permissionDecisionReason) => {
    process.stdout.write(
        JSON.stringify({
            hookSpecificOutput: {
                hookEventName: "PreToolUse",
                permissionDecision,
                permissionDecisionReason,
            },
        })
    );

    return permissionDecision;
};

const input = JSON.parse(fs.readFileSync(0, "utf8"));
const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const filePath = input.tool_input?.file_path;

const relative =
    typeof filePath === "string"
        ? path
              .relative(root, path.resolve(root, filePath))
              .replaceAll("\\", "/")
        : "";

const exists = relative !== "" && fs.existsSync(path.join(root, relative));
const moduleName = relative.match(/^src\/modules\/([^/]+)\//)?.[1];

if (relative.startsWith(MIGRATIONS) && !exists) {
    decide(
        "deny",
        "Rule 9: migrations are created only by `npm run prisma:migrate:create` — edit schema.prisma and run it instead of writing SQL."
    );
} else if (relative.startsWith(MIGRATIONS)) {
    decide(
        "ask",
        "Rule 9: a generated migration may be edited only when the schema cannot express the change (a data backfill, a custom index). Confirm this edit."
    );
} else if (
    moduleName &&
    !fs.existsSync(path.join(root, "src/modules", moduleName))
) {
    decide(
        "deny",
        `Rule 0: create the module with \`npm run generate:module ${moduleName}\`, then edit the files it produced.`
    );
} else if (moduleName && relative.endsWith(".repository.ts") && !exists) {
    const entity = path.basename(relative, ".repository.ts");

    decide(
        "deny",
        `Rule 0: create the repository with \`npm run generate:repository ${entity} -- --module ${moduleName}\` — it also wires Cradle, RESPONSE_MESSAGES and the domain type.`
    );
}
