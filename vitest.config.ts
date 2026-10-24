import tsconfigPaths from "vite-tsconfig-paths";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        env: {
            ...loadEnv("test", process.cwd(), ""),
            NODE_OPTIONS: "--import tsx",
        },
        // `--changed` runs every test when one of these changed: dependencies,
        // config and env reach every test without being imported by one.
        forceRerunTriggers: [
            "**/package.json/**",
            "**/package-lock.json/**",
            "**/{vitest,vite}*.config.*/**",
            "**/tsconfig*.json/**",
            "**/.env.test/**",
        ],
        server: {
            deps: {
                inline: ["@fastify/autoload"],
            },
        },
    },
});
