/**
 * CLAUDE.md Rule 9 guard, run in CI against the PR base:
 * - an existing migration is never edited or deleted;
 * - a data-model change in schema.prisma ships with a new migration;
 * - every migration folder is <timestamp>_snake_case with a non-empty SQL.
 * Compares committed HEAD with its merge-base against MIGRATIONS_BASE_REF
 * (default origin/main). Comments, `/// [Type]` annotations, formatting
 * and generator/datasource blocks do not count as data-model changes.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SCHEMA = "src/database/prisma/schema.prisma";
const MIGRATION_NAME = /^(\d{14})_[a-z0-9_]+$/;
const MIGRATIONS_DIR = "src/database/prisma/migrations/";
const MIGRATION_LOCK = `${MIGRATIONS_DIR}migration_lock.toml`;
const DATA_MODEL_BLOCKS = new Set(["model", "enum", "view", "type"]);

const baseRef = process.env.MIGRATIONS_BASE_REF ?? "origin/main";

const git = (args) => execFileSync("git", args, { encoding: "utf8" });

const readSchemaAt = (ref) => {
    try {
        return git(["show", `${ref}:${SCHEMA}`]);
    } catch {
        return "";
    }
};

const extractDataModel = (schema) => {
    let block = null;

    return schema
        .split(/\r?\n/)
        .map((line) =>
            line
                .replace(/\/\/.*$/, "")
                .replace(/\s+/g, " ")
                .trim()
        )
        .filter((line) => {
            const opening = line.match(/^(\w+) \w+ ?\{$/);

            if (opening) {
                block = opening[1];
            }

            const keep = line !== "" && DATA_MODEL_BLOCKS.has(block);

            if (line === "}") {
                block = null;
            }

            return keep;
        })
        .join("\n");
};

const mergeBase = git(["merge-base", baseRef, "HEAD"]).trim();

const changes = git([
    "diff",
    "--name-status",
    "--no-renames",
    mergeBase,
    "HEAD",
])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
        const [status, file] = line.split("\t");

        return { status, file };
    });

const errors = [];

const editedMigrations = changes.filter(
    ({ status, file }) =>
        file.startsWith(MIGRATIONS_DIR) &&
        file !== MIGRATION_LOCK &&
        status !== "A"
);

if (editedMigrations.length > 0) {
    errors.push(
        "Existing migrations must not be edited or deleted:",
        ...editedMigrations.map(({ status, file }) => `  ${status} ${file}`)
    );
}

const dataModelChanged =
    extractDataModel(readSchemaAt(mergeBase)) !==
    extractDataModel(readSchemaAt("HEAD"));

const addsMigration = changes.some(
    ({ status, file }) =>
        status === "A" &&
        file.startsWith(MIGRATIONS_DIR) &&
        file.endsWith("/migration.sql")
);

if (dataModelChanged && !addsMigration) {
    errors.push(
        `${SCHEMA} changes the data model but no new migration was added.`,
        "  Run `npm run prisma:migrate:create` and commit the generated migration."
    );
}

const migrationDirs = fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

const seenTimestamps = new Map();

for (const dir of migrationDirs) {
    const timestamp = dir.match(MIGRATION_NAME)?.[1];
    const sql = path.join(MIGRATIONS_DIR, dir, "migration.sql");

    if (!timestamp) {
        errors.push(
            `Malformed migration name: ${dir} (expected <14-digit timestamp>_snake_case).`
        );
    } else if (seenTimestamps.has(timestamp)) {
        errors.push(
            `Duplicate migration timestamp ${timestamp}: ${seenTimestamps.get(timestamp)} and ${dir}.`
        );
    } else {
        seenTimestamps.set(timestamp, dir);
    }

    if (!fs.existsSync(sql)) {
        errors.push(`Missing migration.sql in ${dir}.`);
    } else if (fs.readFileSync(sql, "utf8").trim() === "") {
        errors.push(`Empty migration.sql in ${dir}.`);
    }
}

if (errors.length > 0) {
    process.stderr.write(
        `Rule 9 (CLAUDE.md) check failed against ${baseRef}:\n${errors.join("\n")}\n`
    );

    process.exit(1);
}

process.stdout.write(`Rule 9 (CLAUDE.md) check passed against ${baseRef}.\n`);
