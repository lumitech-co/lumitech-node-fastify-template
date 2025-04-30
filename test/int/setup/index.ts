import { beforeEach } from "vitest";
import { setupDatabase } from "./db.js";

beforeEach(async () => {
    const cleanup = await setupDatabase();

    return async () => {
        await cleanup();
    };
});
