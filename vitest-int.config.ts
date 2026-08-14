import defaultConfig from "./vitest.config.js";
import { defineConfig, mergeConfig } from "vitest/config";
import { INT_TEST_WORKERS } from "./test/int/setup/workers.js";

export default mergeConfig(
    defaultConfig,
    defineConfig({
        test: {
            include: ["test/int/**/*.test.ts"],
            globalSetup: ["test/int/setup/global.ts"],
            // Order matters: env.ts must set DATABASE_URL before reset-db.ts
            // opens its connection or a test imports the app.
            setupFiles: [
                "./test/int/setup/env.ts",
                "./test/int/setup/reset-db.ts",
            ],
            // One database is provisioned per worker in global.ts, so the
            // worker count must not exceed what was created there.
            poolOptions: {
                threads: {
                    minThreads: 1,
                    maxThreads: INT_TEST_WORKERS,
                },
                forks: {
                    minForks: 1,
                    maxForks: INT_TEST_WORKERS,
                },
            },
            // Share one module registry across the files a worker runs, so the
            // app's import graph is transformed once per worker instead of once
            // per file. Safe because the integration lane mocks nothing — it
            // drives the real app over inject.
            isolate: false,
            testTimeout: 30000,
            hookTimeout: 30000,
        },
    })
);
