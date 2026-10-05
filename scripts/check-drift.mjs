/**
 * CLAUDE.md Rule 9 guard: replaying every migration must reproduce
 * schema.prisma exactly. Catches a hand-edited migration.sql and a schema
 * change shipped without its migration. Needs Docker (Testcontainers).
 * Prisma 7 moves --shadow-database-url into prisma.config.ts.
 */
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

const PRISMA_DIR = path.join(process.cwd(), "src", "database", "prisma");
const POSTGRES_IMAGE = "postgres:18";
const NO_DIFF = 0;
const HAS_DIFF = 2;

const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withTmpFs({ "/var/lib/postgresql": "rw" })
    .start();

let status;

try {
    status = spawnSync(
        "npx",
        [
            "prisma",
            "migrate",
            "diff",
            "--from-migrations",
            path.join(PRISMA_DIR, "migrations"),
            "--to-schema-datamodel",
            path.join(PRISMA_DIR, "schema.prisma"),
            "--shadow-database-url",
            container.getConnectionUri(),
            "--exit-code",
        ],
        { stdio: "inherit", shell: process.platform === "win32" }
    ).status;
} finally {
    await container.stop();
}

if (status === NO_DIFF) {
    console.log("✓ migrations reproduce schema.prisma — no drift.");
} else if (status === HAS_DIFF) {
    console.error(
        "✗ Drift: replaying the migrations does not reproduce schema.prisma (diff above).\n" +
            "  A migration.sql was edited by hand, or schema.prisma changed without a migration.\n" +
            "  Regenerate it with `npm run prisma:migrate:create` (CLAUDE.md, Rule 9)."
    );

    process.exit(1);
} else {
    console.error("✗ prisma migrate diff failed — see the output above.");
    process.exit(1);
}
