/**
 * Which integration tests a pull request's changed files need. Every rule fails
 * towards running more: a shared or unclassified path, or a module without
 * integration tests of its own, runs the whole suite. A module's tests live in
 * test/int/modules/<name>/ (template layout) or test/int/<name>/.
 * Cross-module breakage a path map cannot see is caught by the full run on main.
 * The CLI is select-int-tests.mjs.
 */

export const INT_MODULES_PREFIX = "test/int/modules/";
export const INT_JOURNEY_DIR = "test/int/journey/";
const INT_DIR = "test/int/";
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
    // node-ci.yml changes in the template; ci.yml picks its version in every repository.
    ".github/workflows/node-ci.yml",
    ".github/workflows/ci.yml",
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
    /^\.github\/workflows\/self-test\.yml$/,
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

        if (file.startsWith(SRC_MODULES_PREFIX)) {
            const [moduleName] = file
                .slice(SRC_MODULES_PREFIX.length)
                .split("/");

            const moduleTests = [
                `${INT_MODULES_PREFIX}${moduleName}/`,
                `${INT_DIR}${moduleName}/`,
            ].find(hasIntTests);

            // Other modules may use it (through DI, invisible to imports), and it
            // has no tests of its own to narrow the run to.
            if (!moduleTests) {
                return {
                    targets: [],
                    runAll: true,
                    reason: `${file} is in a module without integration tests`,
                };
            }

            targets.add(moduleTests);
            addIfTested(INT_JOURNEY_DIR);

            continue;
        }

        if (file.startsWith(INT_DIR)) {
            const [first, second, ...rest] = file
                .slice(INT_DIR.length)
                .split("/");

            const testDir =
                first === "modules"
                    ? rest.length > 0 && `${INT_MODULES_PREFIX}${second}/`
                    : second !== undefined && `${INT_DIR}${first}/`;

            // A folder without tests of its own holds code other tests share.
            if (testDir && hasIntTests(testDir)) {
                targets.add(testDir);

                continue;
            }
        }

        return { targets: [], runAll: true, reason: `${file} is unclassified` };
    }

    return {
        targets: [...targets].sort(),
        runAll: false,
        reason: `${changedFiles.length} changed file(s)`,
    };
};
