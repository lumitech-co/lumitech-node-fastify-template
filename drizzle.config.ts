import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/database/drizzle/schema.ts",
    out: "./src/database/drizzle/migrations",
    casing: "snake_case",
    dbCredentials: {
        url: process.env.DATABASE_URL ?? "",
    },
});
