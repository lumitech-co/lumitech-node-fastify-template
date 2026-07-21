import * as schema from "@/database/drizzle/schema.js";
import fp from "fastify-plugin";
import { Pool } from "pg";
import { FastifyInstance } from "fastify";
import { drizzle } from "drizzle-orm/node-postgres";
import { FastifyPlugin } from "@/lib/constants/fastify.constant.js";

/**
 * `node-postgres` has no notion of Prisma's `?schema=` query parameter, so it is
 * translated into a `search_path` startup option. The integration tests rely on
 * this to give every test run its own isolated schema.
 * */
const buildPoolConfig = (databaseUrl: string) => {
    const url = new URL(databaseUrl);
    const searchSchema = url.searchParams.get("schema");

    url.searchParams.delete("schema");

    return {
        connectionString: url.toString(),
        ...(searchSchema
            ? { options: `-c search_path="${searchSchema}"` }
            : {}),
    };
};

const configureDrizzle = async (fastify: FastifyInstance) => {
    const pool = new Pool(buildPoolConfig(fastify.config.DATABASE_URL));

    await pool.query("SELECT 1");

    fastify.decorate("db", drizzle(pool, { schema }));

    fastify.addHook("onClose", async () => {
        await pool.end();
    });
};

export default fp(configureDrizzle, {
    name: FastifyPlugin.Drizzle,
    dependencies: [FastifyPlugin.Env],
});
