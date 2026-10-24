import defaultConfig from "./vitest.config.js";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
    defaultConfig,
    defineConfig({
        test: {
            include: ["test/unit/**/*.test.ts"],
            // Unit tests own the business logic; plugins, repositories and
            // routes are covered by the integration lane.
            coverage: {
                provider: "v8",
                include: [
                    "src/modules/**/*.{service,util}.ts",
                    "src/lib/**/*.{service,util}.ts",
                ],
                thresholds: {
                    lines: 85,
                    statements: 85,
                    branches: 90,
                    functions: 90,
                },
            },
        },
    })
);
