/**
 * Guards for CLAUDE.md rules that ESLint cannot see: generator wiring
 * (Rule 0) and typed Json columns (Rule 8a).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";

const SRC = path.join(process.cwd(), "src");

const readSource = (file: string): string =>
    fs.readFileSync(path.join(SRC, file), "utf8");

const listDirs = (dir: string): string[] =>
    fs
        .readdirSync(path.join(SRC, dir), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

const kebabToCamel = (name: string): string =>
    name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());

const cradleEntry = (key: string): RegExp => new RegExp(`^\\s+${key}:`, "m");

const cradle = readSource("types/di-container.type.ts");

type JsonField = {
    model: string;
    field: string;
    docLines: string[];
};

const findJsonFields = (schema: string): JsonField[] => {
    const lines = schema.split(/\r?\n/).map((line) => line.trim());
    const fields: JsonField[] = [];
    let model = "";

    lines.forEach((line, index) => {
        const modelMatch = line.match(/^model\s+(\w+)/);

        if (modelMatch) {
            model = modelMatch[1];
        }

        const fieldMatch = line.match(/^(\w+)\s+Json(\?|\[\])?(\s|$)/);

        if (!fieldMatch) {
            return;
        }

        const docLines: string[] = [];

        for (
            let cursor = index - 1;
            cursor >= 0 && lines[cursor].startsWith("///");
            cursor--
        ) {
            docLines.push(lines[cursor]);
        }

        fields.push({ model, field: fieldMatch[1], docLines });
    });

    return fields;
};

describe("Rule 0: modules and repositories are wired by the generators", () => {
    describe.each(listDirs("modules"))("module %s", (name) => {
        const camel = kebabToCamel(name);

        it("has its service and handler in Cradle", () => {
            expect(cradle).toMatch(cradleEntry(`${camel}Service`));
            expect(cradle).toMatch(cradleEntry(`${camel}Handler`));
        });

        it("has a validation folder in src/lib/validation", () => {
            expect(fs.existsSync(path.join(SRC, "lib/validation", name))).toBe(
                true
            );
        });
    });

    describe.each(listDirs("database/repositories"))(
        "repository %s",
        (name) => {
            const camel = kebabToCamel(name);

            it("is registered in Cradle", () => {
                expect(cradle).toMatch(cradleEntry(`${camel}Repository`));
            });

            it("has a RESPONSE_MESSAGES group", () => {
                expect(RESPONSE_MESSAGES).toHaveProperty(camel);
            });
        }
    );
});

describe("Rule 8a: every Json column is typed via prisma-json-types-generator", () => {
    const jsonFields = findJsonFields(
        readSource("database/prisma/schema.prisma")
    );
    const prismaJsonTypes = readSource("types/prisma-json.d.ts");

    it.skipIf(jsonFields.length === 0).each(jsonFields)(
        "$field in model $model has /// [Type] declared in the PrismaJson namespace",
        ({ docLines }) => {
            const typeName = docLines
                .map((line) => line.match(/^\/\/\/\s*\[(\w+)\]/)?.[1])
                .find(Boolean);

            expect(
                typeName,
                "missing `/// [TypeName]` above the field"
            ).toBeDefined();
            expect(prismaJsonTypes).toMatch(
                new RegExp(`\\b(type|interface)\\s+${typeName}\\b`)
            );
        }
    );
});
