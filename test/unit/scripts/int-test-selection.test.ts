import { describe, expect, it } from "vitest";
import { selectIntTests } from "../../../scripts/int-test-selection.mjs";

const TESTED = new Set([
    "test/int/modules/message/",
    "test/int/journey/",
    "test/int/plugins/",
]);

const select = (changedFiles: string[]) =>
    selectIntTests({ changedFiles, hasIntTests: (dir) => TESTED.has(dir) });

describe("selectIntTests", () => {
    it("runs a module's tests and the journeys for a change in that module", () => {
        expect(select(["src/modules/message/message.service.ts"])).toEqual({
            targets: ["test/int/journey/", "test/int/modules/message/"],
            runAll: false,
            reason: "1 changed file(s)",
        });
    });

    it("runs only the changed test's directory for a test-only change", () => {
        expect(
            select([
                "test/int/modules/message/message-pagination.test.ts",
                "test/int/plugins/cache-plugin.test.ts",
            ]).targets
        ).toEqual(["test/int/modules/message/", "test/int/plugins/"]);
    });

    it("skips a module that has no integration tests", () => {
        expect(select(["src/modules/user/user.service.ts"]).targets).toEqual([
            "test/int/journey/",
        ]);
    });

    it.each([
        "src/lib/http/http.util.ts",
        "src/plugins/helmet.ts",
        "src/database/prisma/schema.prisma",
        "src/server.ts",
        "test/int/factories/message.factory.ts",
        "package-lock.json",
        "vitest-int.config.ts",
    ])("runs everything when %s changes", (file) => {
        expect(
            select(["src/modules/message/message.service.ts", file])
        ).toMatchObject({ targets: [], runAll: true });
    });

    it("runs everything for a path it cannot classify", () => {
        expect(select(["scripts/init-s3.sh"])).toMatchObject({
            runAll: true,
            reason: "scripts/init-s3.sh is unclassified",
        });
    });

    it("runs nothing for docs, unit tests and lint tooling", () => {
        expect(
            select([
                "README.md",
                "test/unit/lib/http/http-util.test.ts",
                "scripts/eslint-rules/prefer-dayjs.mjs",
                "eslint.config.mjs",
                ".github/workflows/build.yml",
            ])
        ).toMatchObject({ targets: [], runAll: false });
    });

    it("runs nothing when nothing changed", () => {
        expect(select([])).toEqual({
            targets: [],
            runAll: false,
            reason: "no files changed",
        });
    });
});
