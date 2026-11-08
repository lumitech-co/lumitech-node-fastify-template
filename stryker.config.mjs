/**
 * Local mutation testing over the unit suite: `npm run test:mutation -- --mutate <file>`.
 * It measures whether the tests covering a file can fail; it never breaks the
 * run on a low score and never runs in CI.
 *
 * @type {import("@stryker-mutator/api/core").PartialStrykerOptions}
 */
export default {
    testRunner: "vitest",
    vitest: {
        configFile: "vitest-unit.config.ts",
    },
    // Empty on purpose: without `--mutate` Stryker mutates all of `src` (hours).
    mutate: [],
    reporters: ["clear-text", "progress", "html"],
    htmlReporter: {
        fileName: "reports/mutation/mutation.html",
    },
    incremental: true,
    incrementalFile: "reports/stryker-incremental.json",
    tempDirName: ".stryker-tmp",
};
