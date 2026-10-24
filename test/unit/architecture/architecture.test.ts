/**
 * Guards for CLAUDE.md rules that ESLint cannot see: generator wiring
 * (Rule 0), typed Json columns (Rule 8a), Prisma schema conventions, env
 * schema sync, unused RESPONSE_MESSAGES and blanket eslint-disable directives.
 */
import fs from "node:fs";
import ts from "typescript";
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

type ModuleRepository = {
    module: string;
    entity: string;
    pascal: string;
};

const moduleRepositories: ModuleRepository[] = listDirs("modules").flatMap(
    (module) =>
        fs
            .readdirSync(path.join(SRC, "modules", module))
            .filter((file) => file.endsWith(".repository.ts"))
            .map((file) => {
                const entity = kebabToCamel(file.replace(".repository.ts", ""));

                return {
                    module,
                    entity,
                    pascal: entity.replace(/^./, (char) => char.toUpperCase()),
                };
            })
);

describe("Rule 0: modules and repositories are wired by the generators", () => {
    describe.each(listDirs("modules"))("module %s", (name) => {
        const camel = kebabToCamel(name);

        it("has its service and handler in Cradle", () => {
            expect(cradle).toMatch(cradleEntry(`${camel}Service`));
            expect(cradle).toMatch(cradleEntry(`${camel}Handler`));
        });
    });

    describe.each(moduleRepositories)(
        "repository $entity in module $module",
        ({ entity }) => {
            it("is registered in Cradle", () => {
                expect(cradle).toMatch(cradleEntry(`${entity}Repository`));
            });

            it("has a RESPONSE_MESSAGES group", () => {
                expect(RESPONSE_MESSAGES).toHaveProperty(entity);
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

    const typeAssertions = fs.readFileSync(
        path.join(process.cwd(), "test/unit/architecture/prisma-json.test.ts"),
        "utf8"
    );

    const prismaJsonNames = [
        ...prismaJsonTypes.matchAll(/^\s+(?:type|interface)\s+(\w+)/gm),
    ].map(([, name]) => name!);

    it.each(prismaJsonNames)(
        "PrismaJson.%s is checked against its Zod schema in prisma-json.test.ts (Rule 8b)",
        (name) => {
            expect(typeAssertions).toContain(`PrismaJson.${name}>`);
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

        it("declares onDelete on every relation it owns", () => {
            const implicit = model.lines.filter(
                (line) =>
                    /@relation\([^)]*fields:/.test(line) &&
                    !line.includes("onDelete:")
            );

            expect(implicit).toEqual([]);
        });

        it('uses `id String @id @default(dbgenerated("uuidv7()")) @db.Uuid`', () => {
            const ids = model.lines.filter((line) => /\s@id\b/.test(line));

            expect(
                ids.filter(
                    (line) =>
                        !/^id\s+String\s/.test(line) ||
                        !line.includes('@default(dbgenerated("uuidv7()"))') ||
                        !line.includes("@db.Uuid")
                )
            ).toEqual([]);
        });
    });
});

const srcFiles = (
    fs.readdirSync(SRC, { recursive: true, encoding: "utf8" }) as string[]
)
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file.endsWith(".ts"));

const cradleKeys = [
    ...cradle
        .match(/export type Cradle = \{([\s\S]*?)\n\};/)![1]!
        .matchAll(/^\s+(\w+):/gm),
].map(([, key]) => key!);

const resolverNames = srcFiles.flatMap((file) =>
    [
        ...readSource(file).matchAll(
            /addDIResolverName\(\s*\w+,\s*"(\w+)"\s*\)/g
        ),
    ].map(([, name]) => ({ file, name: name! }))
);

const valueNames = [
    ...readSource("plugins/awilix.ts").matchAll(/^\s+(\w+): asValue\(/gm),
].map(([, name]) => name!);

const LOADED_BY_AWILIX =
    /^(modules\/.+\.(service|handler|repository)|lib\/.+\.service)\.ts$/;

describe("Rule 1: Cradle matches what the container registers", () => {
    const registered = new Set([
        ...resolverNames.map(({ name }) => name),
        ...valueNames,
    ]);

    it.each(cradleKeys)("%s is registered in the container", (key) => {
        expect(registered.has(key)).toBe(true);
    });

    it.each(resolverNames)(
        "$file is picked up by Awilix loadModules",
        ({ file }) => {
            expect(file).toMatch(LOADED_BY_AWILIX);
        }
    );
});

describe("Rule 6: plugin names are declared only when needed", () => {
    const FOUNDATIONAL = new Set(["Prisma", "Env", "Jwt", "Awilix"]);

    const pluginSources = srcFiles
        .filter((file) => file.startsWith("plugins/"))
        .map(readSource);

    const fpOptions = pluginSources.map(
        (source) => source.match(/export default fp\([\s\S]*$/)?.[0] ?? ""
    );

    const declared = new Set(
        fpOptions.flatMap((options) =>
            [...options.matchAll(/name:\s*FastifyPlugin\.(\w+)/g)].map(
                ([, name]) => name!
            )
        )
    );

    const dependedOn = new Set(
        fpOptions.flatMap((options) =>
            [
                ...(
                    options.match(/dependencies:\s*\[([^\]]*)\]/)?.[1] ?? ""
                ).matchAll(/FastifyPlugin\.(\w+)/g),
            ].map(([, name]) => name!)
        )
    );

    const members = [
        ...readSource("lib/constants/fastify.constant.ts").matchAll(
            /^\s+(\w+) = "/gm
        ),
    ].map(([, name]) => name!);

    it.each([...dependedOn])("%s is declared as a plugin name", (name) => {
        expect(declared.has(name)).toBe(true);
    });

    it.each(members)(
        "FastifyPlugin.%s is depended on or foundational",
        (name) => {
            expect(dependedOn.has(name) || FOUNDATIONAL.has(name)).toBe(true);
        }
    );
});

describe("Rule 6: a plugin depends on the plugins whose decorators it reads", () => {
    const LIBRARY_DECORATORS = new Map([
        ["config", "Env"],
        ["jwt", "Jwt"],
    ]);

    const plugins = srcFiles
        .filter((file) => file.startsWith("plugins/"))
        .map((file) => {
            const wrapper = readSource(file);

            const body = wrapper.match(
                /from "@\/modules\/(.+\/mq\/[^"]+)\.js"/
            )?.[1];

            const source = body
                ? `${wrapper}\n${readSource(`modules/${body}.ts`)}`
                : wrapper;

            const options =
                wrapper.match(/export default fp\([\s\S]*$/)?.[0] ?? "";

            return {
                file,
                source,
                name: options.match(/name:\s*FastifyPlugin\.(\w+)/)?.[1],
                dependencies: new Set(
                    [
                        ...(
                            options.match(
                                /dependencies:\s*\[([^\]]*)\]/
                            )?.[1] ?? ""
                        ).matchAll(/FastifyPlugin\.(\w+)/g),
                    ].map(([, name]) => name!)
                ),
            };
        });

    const owners = new Map<string, { file: string; name: string | undefined }>([
        ...[...LIBRARY_DECORATORS].map(
            ([decorator, name]) => [decorator, { file: "", name }] as const
        ),
        ...plugins.flatMap(({ file, source, name }) =>
            [...source.matchAll(/\.decorate\(\s*"(\w+)"/g)].map(
                ([, decorator]) => [decorator!, { file, name }] as const
            )
        ),
    ]);

    const reads = plugins.flatMap(({ file, source, name, dependencies }) =>
        [
            ...new Set(
                [...source.matchAll(/\bfastify\.(\w+)/g)].map(([, key]) => key!)
            ),
        ]
            .map((decorator) => ({ decorator, owner: owners.get(decorator) }))
            .filter(
                ({ owner }) =>
                    owner && owner.file !== file && owner.name !== name
            )
            .map(({ decorator, owner }) => ({
                file,
                decorator,
                owner: owner!.name ?? `(unnamed plugin in ${owner!.file})`,
                dependencies,
            }))
    );

    it("finds plugins reading another plugin's decorator, so an empty scan cannot pass", () => {
        expect(reads.length).toBeGreaterThan(0);
    });

    it.each(reads)(
        "$file lists $owner in dependencies for fastify.$decorator",
        ({ owner, dependencies }) => {
            expect([...dependencies]).toContain(owner);
        }
    );
});

describe("Rule 0: every module has the files the generator creates", () => {
    describe.each(listDirs("modules"))("module %s", (name) => {
        it.each([
            "index.ts",
            `${name}.route.ts`,
            `${name}.handler.ts`,
            `${name}.service.ts`,
            `${name}.schema.ts`,
            "public.ts",
            "README.md",
        ])("has %s", (file) => {
            expect(fs.existsSync(path.join(SRC, "modules", name, file))).toBe(
                true
            );
        });
    });

    it.each(moduleRepositories)(
        "$module.type.ts declares the $pascal domain model of $entity.repository.ts",
        ({ module, pascal }) => {
            expect(readSource(`modules/${module}/${module}.type.ts`)).toMatch(
                new RegExp(`^(export )?type ${pascal} = \\{`, "m")
            );
        }
    );
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

type RouteBinding = {
    module: string;
    method: string;
    routeKeys: string[];
    responseCodes: number[];
};

const sortedKeys = (source: string, pattern: RegExp): string[] =>
    [...source.matchAll(pattern)].map(([, key]) => key!.toLowerCase()).sort();

const routeBindings: RouteBinding[] = listDirs("modules").flatMap((module) =>
    [
        ...readSource(`modules/${module}/${module}.route.ts`).matchAll(
            /fastify\.(?:get|post|put|patch|delete|head|options)\(([\s\S]*?)\b\w+Handler\.(\w+)\s*,?\s*\)/g
        ),
    ].map(([, options, method]) => ({
        module,
        method: method!,
        routeKeys: sortedKeys(
            options!,
            /\b(body|params|querystring|headers):/g
        ),
        responseCodes: [...options!.matchAll(/\b([1-5]\d{2})\s*:/g)].map(
            ([, code]) => Number(code)
        ),
    }))
);

describe("Rule 7: every request part a handler reads is validated by its route", () => {
    it("finds routes, so an empty scan cannot pass", () => {
        expect(routeBindings.length).toBeGreaterThan(0);
    });

    it.each(routeBindings)(
        "$module: $method declares a schema for every Body/Params/Querystring/Headers it types",
        ({ module, method, routeKeys }) => {
            const handlerType = readSource(
                `modules/${module}/${module}.handler.ts`
            );

            const signature = [
                ...handlerType.matchAll(
                    /(\w+):\s*\(\s*request:\s*FastifyRequest(?:<\{([\s\S]*?)\}>)?/g
                ),
            ].find(([, name]) => name === method);

            expect(
                signature,
                `${method} is not in the handler type`
            ).toBeDefined();

            expect(
                sortedKeys(
                    signature![2] ?? "",
                    /\b(Body|Params|Querystring|Headers):/g
                )
            ).toEqual(routeKeys);
        }
    );
});

/**
 * Status codes a handler method replies with: the literal in reply.status(N) /
 * reply.code(N), or 200 when it only calls reply.send. NaN marks a non-literal.
 */
const handlerStatuses = ({
    module,
    method,
}: Pick<RouteBinding, "module" | "method">): number[] => {
    const statuses: number[] = [];

    const visit = (node: ts.Node, inMethod: boolean): void => {
        const isMethod =
            ts.isPropertyAssignment(node) &&
            node.name.getText() === method &&
            (ts.isArrowFunction(node.initializer) ||
                ts.isFunctionExpression(node.initializer));

        const inside = inMethod || isMethod;

        if (
            inside &&
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ["status", "code"].includes(node.expression.name.text)
        ) {
            const [status] = node.arguments;

            statuses.push(
                status && ts.isNumericLiteral(status)
                    ? Number(status.text)
                    : NaN
            );
        }

        ts.forEachChild(node, (child) => {
            visit(child, inside);
        });
    };

    visit(parseSource(`modules/${module}/${module}.handler.ts`), false);

    return statuses.length > 0 ? statuses : [200];
};

describe("every status a handler replies with has a response schema on its route", () => {
    it.each(routeBindings)(
        "$module: $method replies only with codes in its route's response",
        ({ module, method, responseCodes }) => {
            const statuses = handlerStatuses({ module, method });

            expect(
                statuses.every(Number.isInteger),
                `${method} must pass a literal status to reply.status()`
            ).toBe(true);

            expect(
                responseCodes,
                "without a schema for the code, Fastify sends the payload unfiltered"
            ).toEqual(expect.arrayContaining(statuses));
        }
    );
});

type FactoryParam = {
    file: string;
    name: string;
    type: string;
};

const parseSource = (file: string): ts.SourceFile =>
    ts.createSourceFile(file, readSource(file), ts.ScriptTarget.Latest, true);

const normalizeType = (type: string): string => type.replace(/\s+/g, "");

const cradleTypes = new Map(
    parseSource("types/di-container.type.ts")
        .statements.filter(ts.isTypeAliasDeclaration)
        .filter((alias) => alias.name.text === "Cradle")
        .flatMap((alias) =>
            ts.isTypeLiteralNode(alias.type) ? [...alias.type.members] : []
        )
        .filter(ts.isPropertySignature)
        .map((member) => [
            member.name.getText(),
            normalizeType(member.type?.getText() ?? ""),
        ])
);

const factoryParams: FactoryParam[] = srcFiles
    .filter((file) => LOADED_BY_AWILIX.test(file))
    .flatMap((file) =>
        parseSource(file)
            .statements.filter(ts.isVariableStatement)
            .flatMap((statement) => [...statement.declarationList.declarations])
            .filter(
                (declaration) =>
                    declaration.name.getText().startsWith("create") &&
                    declaration.initializer !== undefined &&
                    ts.isArrowFunction(declaration.initializer)
            )
            .flatMap((declaration) =>
                ts.isArrowFunction(declaration.initializer!)
                    ? [...declaration.initializer.parameters]
                    : []
            )
            .map((parameter) => ({
                file,
                name: parameter.name.getText(),
                type: normalizeType(parameter.type?.getText() ?? ""),
            }))
    );

describe("Rule 1: every factory parameter is a Cradle entry of the same type", () => {
    it("finds factory parameters, so an empty scan cannot pass", () => {
        expect(factoryParams.length).toBeGreaterThan(0);
    });

    it.each(factoryParams)(
        "$file: $name is resolved by Awilix as typed",
        ({ name, type }) => {
            expect(
                cradleTypes.has(name),
                `Awilix resolves "${name}" by name — it is not a Cradle key`
            ).toBe(true);

            expect(type).toBe(cradleTypes.get(name));
        }
    );
});

const routeEndpoints = (module: string): string[] => {
    const route = readSource(`modules/${module}/${module}.route.ts`);

    const prefix =
        readSource(`modules/${module}/index.ts`).match(
            /export const autoPrefix = "([^"]*)"/
        )?.[1] ?? "";

    const paths = new Map(
        [...route.matchAll(/^\s+(\w+) = "([^"]*)"/gm)].map(([, key, value]) => [
            key!,
            value!,
        ])
    );

    return [
        ...route.matchAll(
            /fastify\.(get|post|put|patch|delete)\(\s*\w+\.(\w+)/g
        ),
    ]
        .map(
            ([, method, key]) =>
                `${method!.toUpperCase()} ${`${prefix}${paths.get(key!) ?? ""}`.replace(/\/{2,}/g, "/")}`
        )
        .sort();
};

const readmeEndpoints = (module: string): string[] =>
    [
        ...readSource(`modules/${module}/README.md`).matchAll(
            /^\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*(\S+)\s*\|/gm
        ),
    ]
        .map(([, method, endpoint]) => `${method} ${endpoint}`)
        .sort();

describe("module README lists exactly the module's endpoints", () => {
    it.each(listDirs("modules"))(
        "%s: README Endpoints table matches the route file",
        (module) => {
            expect(readmeEndpoints(module)).toEqual(routeEndpoints(module));
        }
    );
});
