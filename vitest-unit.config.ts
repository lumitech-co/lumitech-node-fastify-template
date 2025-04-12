import defaultConfig from "./vitest.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
    defaultConfig,
    defineConfig({
        test: {
            include: ["test/unit/**/*.test.ts"],
        },
    })
);
