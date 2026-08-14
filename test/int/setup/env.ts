import { inject } from "vitest";
import { withDatabase, workerDatabaseName } from "./workers.js";

// Each vitest worker owns one of the databases cloned in global.ts, so files
// can run in parallel without seeing each other's rows.
const poolId = Number(process.env.VITEST_POOL_ID ?? 1);

// Must run before anything imports the app (src/plugins/env.ts snapshots
// process.env at plugin registration), so this file is listed first in
// `setupFiles`. The DATABASE_URL in .env.test is only a schema-valid
// placeholder — the real one is the container started in global.ts.
process.env.DATABASE_URL = withDatabase(
    inject("databaseUri"),
    workerDatabaseName(poolId)
);
