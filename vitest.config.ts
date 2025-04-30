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
        server: {
            deps: {
                inline: ["@fastify/autoload"],
            },
        },
    },
});
