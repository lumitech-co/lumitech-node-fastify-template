/**
 * Guards for CLAUDE.md rules that ESLint cannot see: generator wiring
 * (Rule 0), typed Json columns (Rule 8a), Prisma schema conventions, env
 * schema sync, unused RESPONSE_MESSAGES and blanket eslint-disable directives.
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
            model = modelMatch[1]!;
        }

        const fieldMatch = line.match(/^(\w+)\s+Json(\?|\[\])?(\s|$)/);

        if (!fieldMatch) {
            return;
        }

        const docLines: string[] = [];

        for (
            let cursor = index - 1;
            cursor >= 0 && lines[cursor]!.startsWith("///");
            cursor--
        ) {
            docLines.push(lines[cursor]!);
        }

        fields.push({ model, field: fieldMatch[1]!, docLines });
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

describe("arch/* rules are never switched off", () => {
    const sources = (
        fs.readdirSync(SRC, { recursive: true, encoding: "utf8" }) as string[]
    ).filter((file) => /\.(ts|js)$/.test(file));

    it.each(sources)("%s has no blanket eslint-disable", (file) => {
        expect(readSource(file)).not.toMatch(
            /eslint-disable(-next-line|-line)?\s*(\*\/|$|--)/m
        );
    });

    it.each(sources)("%s does not disable an arch/* rule", (file) => {
        expect(readSource(file)).not.toMatch(/eslint-disable\S*[^\n]*\barch\//);
    });
});

type PrismaModel = {
    name: string;
    lines: string[];
};

const prismaModels: PrismaModel[] = [
    ...readSource("database/prisma/schema.prisma").matchAll(
        /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm
    ),
].map(([, name, body]) => ({
    name: name!,
    lines: body!
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "" && !line.startsWith("//")),
}));

const modelNames = new Set(prismaModels.map(({ name }) => name));

const toSnakeCase = (name: string): string =>
    name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

const fieldsOf = (model: PrismaModel): string[][] =>
    model.lines
        .filter((line) => !line.startsWith("@@"))
        .map((line) => line.split(/\s+/));

const blockIndexes = (model: PrismaModel): string[][] =>
    model.lines
        .map((line) => line.match(/^@@(?:index|unique|id)\(\[([^\]]*)\]/))
        .filter((match) => match !== null)
        .map((match) => match[1]!.split(",").map((field) => field.trim()));

describe("Prisma schema conventions", () => {
    it("finds models, so an empty scan cannot pass", () => {
        expect(prismaModels.length).toBeGreaterThan(0);
    });

    describe.each(prismaModels)("model $name", (model) => {
        it('maps to a snake_case table with @@map("...")', () => {
            const table = model.lines
                .map((line) => line.match(/^@@map\("([^"]+)"\)/)?.[1])
                .find(Boolean);

            expect(table, "missing @@map").toMatch(/^[a-z][a-z0-9_]*$/);
        });

        it("has createdAt and an @updatedAt updatedAt", () => {
            const fields = fieldsOf(model);

            expect(fields.some(([name]) => name === "createdAt")).toBe(true);

            expect(
                fields.some(
                    ([name, ...rest]) =>
                        name === "updatedAt" && rest.includes("@updatedAt")
                )
            ).toBe(true);
        });

        it("maps every camelCase column to snake_case", () => {
            const unmapped = fieldsOf(model)
                .filter(
                    ([name, type]) =>
                        /[A-Z]/.test(name!) &&
                        !modelNames.has(type!.replace(/[?[\]]/g, ""))
                )
                .filter(
                    ([name, ...rest]) =>
                        !rest
                            .join(" ")
                            .includes(`@map("${toSnakeCase(name!)}")`)
                )
                .map(([name]) => name);

            expect(unmapped).toEqual([]);
        });

        it("indexes every foreign key (Postgres does not do it for you)", () => {
            const indexes = blockIndexes(model);

            const unindexed = model.lines
                .map((line) =>
                    line.match(/@relation\([^)]*fields:\s*\[([^\]]*)\]/)
                )
                .filter((match) => match !== null)
                .map((match) =>
                    match[1]!.split(",").map((field) => field.trim())
                )
                .filter(
                    (foreignKey) =>
                        !indexes.some((index) =>
                            foreignKey.every((field, at) => index[at] === field)
                        ) &&
                        !(
                            foreignKey.length === 1 &&
                            fieldsOf(model).some(
                                ([name, , ...rest]) =>
                                    name === foreignKey[0] &&
                                    rest.some((attr) =>
                                        /^@(id|unique)\b/.test(attr)
                                    )
                            )
                        )
                )
                .map((foreignKey) => foreignKey.join(", "));

            expect(unindexed, "add @@index([...]) for these").toEqual([]);
        });
    });
});

describe("Rule 7: the env schema, EnvConfig and .env.example agree", () => {
    const envPlugin = readSource("plugins/env.ts");

    const props = envPlugin
        .split(".prop(")
        .slice(1)
        .map((segment) => ({
            name: segment.match(/"(\w+)"/)![1]!,
            hasDefault: segment.includes(".default("),
        }));

    const required = new Set(
        [
            ...envPlugin
                .match(/\.required\(\[([\s\S]*?)\]\)/)![1]!
                .matchAll(/"(\w+)"/g),
        ].map(([, name]) => name!)
    );

    const envConfig = new Map(
        [
            ...readSource("types/env.type.ts").matchAll(
                /^\s+(\w+):\s*([^;]+);/gm
            ),
        ].map(([, name, type]) => [name!, /\|\s*undefined/.test(type!)])
    );

    const envExample = fs.readFileSync(
        path.join(process.cwd(), ".env.example"),
        "utf8"
    );

    it("declares the same keys in env.ts and EnvConfig", () => {
        expect([...envConfig.keys()].sort()).toEqual(
            props.map(({ name }) => name).sort()
        );
    });

    it.each(props)(
        "$name is `| undefined` in EnvConfig only when optional without a default",
        ({ name, hasDefault }) => {
            expect(envConfig.get(name)).toBe(
                !required.has(name) && !hasDefault
            );
        }
    );

    it.each(props.filter(({ hasDefault }) => !hasDefault))(
        "$name is listed in .env.example",
        ({ name }) => {
            expect(envExample).toMatch(new RegExp(`^${name}=`, "m"));
        }
    );
});

describe("Rule 5a: every RESPONSE_MESSAGES entry is used", () => {
    const sources = (
        fs.readdirSync(SRC, { recursive: true, encoding: "utf8" }) as string[]
    )
        .filter((file) => file.endsWith(".ts"))
        .filter((file) => !file.endsWith("messages.constant.ts"))
        .map(readSource)
        .join("\n");

    const entries = Object.entries(RESPONSE_MESSAGES).flatMap(
        ([group, messages]) =>
            Object.keys(messages).map(
                (key) => `RESPONSE_MESSAGES.${group}.${key}`
            )
    );

    it.each(entries)("%s is referenced in src/", (entry) => {
        expect(sources).toContain(entry);
    });
});
