/**
 * Which integration tests a pull request's changed files need. Every rule fails
 * towards running more: a shared or unclassified path runs the whole suite.
 * Cross-module breakage a path map cannot see is caught by the full run on main.
 * Ported from tolmete-api; the CLI is select-int-tests.mjs.
 */

export const INT_MODULES_PREFIX = "test/int/modules/";
export const INT_JOURNEY_DIR = "test/int/journey/";
export const INT_PLUGINS_DIR = "test/int/plugins/";
const SRC_MODULES_PREFIX = "src/modules/";

/** Behaviour no single module owns: the selection is abandoned. */
export const RUNS_EVERYTHING = [
    "src/plugins/",
    "src/lib/",
    "src/database/",
    "src/types/",
    "src/server.ts",
    "src/index.ts",
    "src/worker.ts",
    "test/int/setup/",
    "test/int/factories/",
    "test/int/helpers/",
    "vitest.config.ts",
    "vitest-int.config.ts",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.build.json",
    "docker-compose.test.yml",
    ".env.test",
    ".github/workflows/integration-test.yml",
    "scripts/int-test-selection.mjs",
    "scripts/select-int-tests.mjs",
];

/** Never loaded by an integration test. Being wrong here loses coverage. */
export const RUNS_NOTHING = [
    /\.md$/,
    /^LICENSE$/,
    /^\.vscode\//,
    /^\.idea\//,
    /^\.claude\//,
    /^\.husky\//,
    /^test\/unit\//,
    /^cli\//,
    /^scripts\/(eslint-rules|claude-hooks)\//,
    /^eslint\.config\.mjs$/,
    /^vitest-unit\.config\.ts$/,
    /^stryker\.config\.mjs$/,
    /^knip\.jsonc$/,
    /^osv-scanner\.toml$/,
    /^commitlint\.config\.js$/,
    /^\.env\.example$/,
    /^\.gitignore$/,
    /^\.squawk\.toml$/,
    /^Dockerfile$/,
    /^\.dockerignore$/,
    /^docker-compose\.yml$/,
    /^\.github\/workflows\/(build|unit-test)\.yml$/,
];

/**
 * @param {{ changedFiles: string[], hasIntTests: (dir: string) => boolean }} payload
 *   `hasIntTests` tells whether a directory holds a test file: a Vitest filter
 *   that matches none fails the run.
 * @returns {{ targets: string[], runAll: boolean, reason: string }}
 *   `targets` are directory prefixes for Vitest, empty when everything runs.
 */
export const selectIntTests = ({ changedFiles, hasIntTests }) => {
    if (changedFiles.length === 0) {
        return { targets: [], runAll: false, reason: "no files changed" };
    }

    const targets = new Set();

    const addIfTested = (dir) => {
        if (hasIntTests(dir)) {
            targets.add(dir);
        }
    };

    for (const file of changedFiles) {
        if (RUNS_NOTHING.some((pattern) => pattern.test(file))) {
            continue;
        }

        if (RUNS_EVERYTHING.some((prefix) => file.startsWith(prefix))) {
            return { targets: [], runAll: true, reason: `${file} is shared` };
        }

        const modulePrefix = [SRC_MODULES_PREFIX, INT_MODULES_PREFIX].find(
            (prefix) => file.startsWith(prefix)
        );

        if (modulePrefix) {
            const [moduleName] = file.slice(modulePrefix.length).split("/");

            addIfTested(`${INT_MODULES_PREFIX}${moduleName}/`);

            if (modulePrefix === SRC_MODULES_PREFIX) {
                addIfTested(INT_JOURNEY_DIR);
            }

            continue;
        }

        const ownDir = [INT_JOURNEY_DIR, INT_PLUGINS_DIR].find((dir) =>
            file.startsWith(dir)
        );

        if (ownDir) {
            addIfTested(ownDir);

            continue;
        }

        return { targets: [], runAll: true, reason: `${file} is unclassified` };
    }

    return {
        targets: [...targets].sort(),
        runAll: false,
        reason: `${changedFiles.length} changed file(s)`,
    };
};
