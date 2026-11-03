/**
 * Generator contract: what `generate:module` and `generate:repository`
 * produce must pass lint, tsc and the architecture tests as generated.
 * Scaffolds a throwaway module on throwaway models, checks, then restores.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MODULE_DIR = "src/modules/generator-probe";

const WIRED_FILES = [
    "src/database/prisma/schema.prisma",
    "src/types/di-container.type.ts",
    "src/lib/messages/messages.constant.ts",
];

const PROBE_MODELS = ["GeneratorProbe", "GeneratorProbeItem"]
    .map(
        (model) => `
model ${model} {
  id        String   @id @default(dbgenerated("uuidv7()")) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("${model.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}s")
}
`
    )
    .join("");

const run = (command) => {
    console.log(`\n$ ${command}`);

    return spawnSync(command, { shell: true, stdio: "inherit" }).status === 0;
};

const backups = new Map(
    WIRED_FILES.map((file) => [file, fs.readFileSync(file, "utf8")])
);

let passed = false;

try {
    fs.appendFileSync(WIRED_FILES[0], PROBE_MODELS);

    passed = [
        "npx prisma generate",
        "npm run generate:module generatorProbe",
        "npm run generate:repository generatorProbe",
        "npm run generate:repository generatorProbeItem -- --module generatorProbe",
        `npx eslint --max-warnings 0 ${MODULE_DIR} src/types/di-container.type.ts`,
        "npx tsc --noEmit",
        "npx vitest run -c vitest-unit.config.ts test/unit/architecture",
    ].every(run);
} finally {
    fs.rmSync(path.resolve(MODULE_DIR), { recursive: true, force: true });

    for (const [file, content] of backups) {
        fs.writeFileSync(file, content);
    }

    run("npx prisma generate");
}

console.log(
    passed
        ? "\n✅ Generated code passes lint, tsc and the architecture tests."
        : "\n❌ Generated code breaks the template's rules — fix the generator (CLAUDE.md, Rule 0)."
);

process.exitCode = passed ? 0 : 1;
