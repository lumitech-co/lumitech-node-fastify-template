import { beforeEach } from "vitest";
import { flushCache } from "./cache.js";
import { setupDatabase } from "./db.js";

beforeEach(async () => {
    await flushCache();

    const cleanup = await setupDatabase();

    return async () => {
        await cleanup();
    };
});
