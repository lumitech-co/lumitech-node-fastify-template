import path from "node:path";
import fs from "node:fs/promises";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import {
    INT_TEST_WORKERS,
    TEMPLATE_DATABASE,
    withDatabase,
    workerDatabaseName,
} from "./workers.js";

declare module "vitest" {
    interface ProvidedContext {
        databaseUri: string;
    }
}

/**
 * Applies the migration history.
 *
 * Kept over `prisma db push` because objects that live only in migration SQL
 * — triggers, functions, extensions, custom indexes — are not representable in
 * schema.prisma and would be silently missing from a schema-only push.
 */
const runMigrationFiles = async (client: Client) => {
    const migrationsDir = path.join(
        process.cwd(),
        "src",
        "database",
        "prisma",
        "migrations"
    );

    const migrationDirs = await fs.readdir(migrationsDir);

    const validDirs = migrationDirs
        .filter((file) => file !== "migration_lock.toml")
        .sort();

    for (const dir of validDirs) {
        const dirPath = path.join(migrationsDir, dir);
        const dirFiles = await fs.readdir(dirPath);
        const migrationFile = dirFiles.find((file) => file.endsWith(".sql"));

        if (!migrationFile) {
            throw new Error(`No migration file found in ${dirPath}`);
        }

        const migrationSQL = await fs.readFile(
            path.join(dirPath, migrationFile),
            "utf-8"
        );

        await client.query(migrationSQL);
    }
};

/**
 * Boots one throwaway Postgres for the whole run, migrates a template database
 * once, then clones one database per vitest worker.
 *
 * Migration work happens once per run rather than once per test. Per-test
 * isolation is a TRUNCATE (see reset-db.ts) and per-worker isolation is a
 * separate database, so test files still run in parallel.
 */
const globalSetup = async ({ provide }: TestProject) => {
    const container = await new PostgreSqlContainer("postgres:16.4")
        .withTmpFs({ "/var/lib/postgresql/data": "rw" })
        .start();

    const databaseUri = container.getConnectionUri();

    const admin = new Client({ connectionString: databaseUri });

    await admin.connect();

    try {
        await admin.query(`CREATE DATABASE "${TEMPLATE_DATABASE}"`);

        const template = new Client({
            connectionString: withDatabase(databaseUri, TEMPLATE_DATABASE),
        });

        await template.connect();

        try {
            await runMigrationFiles(template);
        } finally {
            await template.end();
        }

        // Sequential on purpose: Postgres refuses to copy a template that is
        // being read by another CREATE DATABASE at the same moment.
        for (let poolId = 1; poolId <= INT_TEST_WORKERS; poolId++) {
            await admin.query(
                `CREATE DATABASE "${workerDatabaseName(poolId)}" TEMPLATE "${TEMPLATE_DATABASE}"`
            );
        }
    } finally {
        await admin.end();
    }

    provide("databaseUri", databaseUri);

    return async () => {
        await container.stop();
    };
};

export default globalSetup;
