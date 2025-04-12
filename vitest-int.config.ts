import defaultConfig from "./vitest.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
    defaultConfig,
    defineConfig({
        test: {
            setupFiles: "./test/int/setup.ts",
            include: ["test/int/**/*.test.ts"],
        },
    })
);
