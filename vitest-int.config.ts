import defaultConfig from "./vitest.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
    defaultConfig,
    defineConfig({
        test: {
            setupFiles: "./test/int/setup/index.ts",
            include: ["test/int/**/*.test.ts"],
            /**
             * Redis is a single shared instance flushed before each test (see
             * test/int/setup/cache.ts), so integration test files must not run
             * concurrently — otherwise one file's cache prime lands between
             * another file's flush and its first request, turning an expected
             * MISS into a HIT. Run the files sequentially.
             */
            fileParallelism: false,
        },
    })
);
