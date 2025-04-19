import path from "node:path";
import fs from "node:fs/promises";
import { Client } from "pg";
import { randomUUID } from "node:crypto";

const generateDatabaseURL = (schema: string) => {
    if (!process.env.DATABASE_URL) {
        throw new Error("Please provide a DATABASE_URL environment variable.");
    }

    const url = new URL(process.env.DATABASE_URL);

    url.searchParams.set("schema", schema);

    return url.toString();
};

/**
 * Run prisma migrations manually to increase the performance.
 *
 * Running migrations with manual execution is 3x faster then running "npx prisma deploy" cli command.
 * */
const runMigrationFiles = async (client: Client, schema: string) => {
    try {
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);

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

            const migrationFile = dirFiles.find((file) =>
                file.endsWith(".sql")
            );

            if (!migrationFile) {
                throw new Error(`No migration file found in ${dirPath}`);
            }

            const migrationFilePath = path.join(dirPath, migrationFile);

            const migrationSQL = await fs.readFile(migrationFilePath, "utf-8");

            await client.query(migrationSQL);
        }
    } catch (error) {
        console.error("Migration process failed:", error);
        throw new Error("Migration failed");
    }
};

export const setupDatabase = async (): Promise<() => Promise<void>> => {
    const schema = randomUUID();
    const databaseURL = generateDatabaseURL(schema);

    const client = new Client({
        connectionString: databaseURL,
        options: `-c search_path="${schema}"`,
    });

    await client.connect();

    process.env.DATABASE_URL = databaseURL;

    await runMigrationFiles(client, schema);

    return async () => {
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);

        await client.end();
    };
};
