/**
 * Every arch/* rule in eslint.config.mjs fires on its violation and stays
 * quiet on the allowed shape, through the real config and its file globs. A
 * selector that silently stops matching leaves lint green on a clean repo, so
 * only a deliberate violation proves it still works.
 */
import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

type Case = {
    rule: string;
    file: string;
    code: string;
    reports: boolean;
};

const SERVICE = "src/modules/demo/demo.service.ts";
const HANDLER = "src/modules/demo/demo.handler.ts";
const ROUTE = "src/modules/demo/demo.route.ts";
const MODULE_TYPE = "src/modules/demo/demo.type.ts";
const MODULE_CONSTANT = "src/modules/demo/demo.constant.ts";
const WORKER = "src/modules/demo/mq/demo.worker.ts";
const SCHEMA = "src/lib/validation/demo/demo.schema.ts";
const LIB_UTIL = "src/lib/demo/demo.util.ts";
const REPOSITORY = "src/database/repositories/demo/demo.repository.ts";

const ROUTE_OPTIONS =
    '{ schema: { tags: [DEMO_TAG], summary: "s", response: {} } }';

const factory = (...body: string[]): string =>
    [
        "export const createService = (demoRepository: DemoRepository): DemoService => {",
        ...body,
        "};",
    ].join("\n");

const pair = (
    rule: string,
    bad: Omit<Case, "rule" | "reports">,
    good: Omit<Case, "rule" | "reports">
): Case[] => [
    { rule, ...bad, reports: true },
    { rule, ...good, reports: false },
];

const CASES: Case[] = [
    ...pair(
        "layer-direction",
        {
            file: LIB_UTIL,
            code: 'import { MESSAGE_CACHE_NAMESPACE } from "@/modules/message/message.constant.js";',
        },
        {
            file: SERVICE,
            code: 'import type { MessageService } from "@/modules/message/message.service.js";',
        }
    ),
    ...pair(
        "file-naming",
        { file: "src/modules/demo/other.service.ts", code: "const a = 1;" },
        { file: SERVICE, code: "const a = 1;" }
    ),
    ...pair(
        "transaction-via-repositories",
        {
            file: SERVICE,
            code: "prisma.$transaction(async (tx) => tx.message.findMany());",
        },
        {
            file: SERVICE,
            code: "prisma.$transaction(async (tx) => demoRepository.create(tx));",
        }
    ),
    ...pair(
        "no-prisma-shape-outside-repository",
        {
            file: MODULE_TYPE,
            code: "export type W = Prisma.MessageWhereInput;",
        },
        {
            file: REPOSITORY,
            code: "export type W = Prisma.MessageWhereInput;",
        }
    ),
    ...pair(
        "prefer-find-unique-or-fail",
        {
            file: SERVICE,
            code: [
                "async function load(id: string) {",
                "    const row = await demoRepository.findUnique({ where: { id } });",
                "    if (!row) {",
                "        throw new NotFoundError(MESSAGE);",
                "    }",
                "    return row;",
                "}",
            ].join("\n"),
        },
        {
            file: SERVICE,
            code: "async function load(id: string) { return demoRepository.findUniqueOrFail({ where: { id } }); }",
        }
    ),
    ...pair(
        "no-single-repository-transaction",
        {
            file: SERVICE,
            code: "prisma.$transaction(async (tx) => { await demoRepository.a(tx); await demoRepository.b(tx); });",
        },
        {
            file: SERVICE,
            code: "prisma.$transaction(async (tx) => { await demoRepository.a(tx); await otherRepository.b(tx); });",
        }
    ),
    ...pair(
        "no-relation-join-with-cursor",
        {
            file: SERVICE,
            code: 'demoRepository.findMany({ take: 1, relationLoadStrategy: "join", ...(cursor ? { cursor: { id: cursor } } : {}) });',
        },
        {
            file: SERVICE,
            code: 'demoRepository.findMany({ take: 1, relationLoadStrategy: "join" });',
        }
    ),
    ...pair(
        "no-duplicate-repository-read",
        {
            file: SERVICE,
            code: [
                "const a = await demoRepository.findFirst({ where: { id } });",
                "const b = await demoRepository.findMany({ where: { id }, take: 1 });",
            ].join("\n"),
        },
        {
            file: SERVICE,
            code: [
                "const a = await demoRepository.findFirst({ where: { id } });",
                "await demoRepository.update({ where: { id }, data: {} });",
                "const b = await demoRepository.findFirst({ where: { id } });",
            ].join("\n"),
        }
    ),
    {
        rule: "no-duplicate-repository-read",
        file: SERVICE,
        code: [
            "const rows = await demoRepository.findMany({ where: { id }, take: 1 });",
            "const total = await demoRepository.count({ where: { id } });",
        ].join("\n"),
        reports: false,
    },
    {
        rule: "no-duplicate-repository-read",
        file: SERVICE,
        code: "const row = flag ? await demoRepository.findFirst({ where: { id } }) : await demoRepository.findFirst({ where: { id } });",
        reports: false,
    },
    ...pair(
        "no-dependency-free-factory-helper",
        {
            file: SERVICE,
            code: factory(
                "return { a: async () => toRow(1) };",
                "function toRow(value: number) { return { value }; }"
            ),
        },
        {
            file: SERVICE,
            code: factory(
                "return { a: async () => load(1) };",
                "function load(id: number) { return demoRepository.findUniqueOrFail({ where: { id } }); }"
            ),
        }
    ),
    ...pair(
        "no-pass-through-helper",
        {
            file: SERVICE,
            code: factory(
                "return { a: async ({ id }: P) => load({ id }) };",
                "async function load({ id }: P) { return demoRepository.findUniqueOrFail({ id }); }"
            ),
        },
        {
            file: SERVICE,
            code: factory(
                "return { a: async ({ id }: P) => load({ id }) };",
                "async function load({ id }: P) { return demoRepository.findUniqueOrFail({ where: { id } }); }"
            ),
        }
    ),
    ...pair(
        "inline-unshared-service-method",
        {
            file: SERVICE,
            code: factory(
                "return { read };",
                "async function read() { return demoRepository.findMany({ take: 1 }); }"
            ),
        },
        {
            file: SERVICE,
            code: factory(
                "return { list: async () => read() };",
                "async function read() { return demoRepository.findMany({ take: 1 }); }"
            ),
        }
    ),
    ...pair(
        "no-unsafe-raw-sql",
        {
            file: REPOSITORY,
            code: "prisma.$queryRawUnsafe(`SELECT * FROM t WHERE id = ${id}`);",
        },
        { file: REPOSITORY, code: 'prisma.$queryRawUnsafe("SELECT 1");' }
    ),
    ...pair(
        "worker-imports",
        {
            file: WORKER,
            code: 'import type { PrismaClient } from "@prisma/client";',
        },
        { file: WORKER, code: 'import { Worker } from "bullmq";' }
    ),
    ...pair(
        "thin-workers",
        { file: WORKER, code: 'fastify.di.resolve("demoRepository");' },
        { file: WORKER, code: 'fastify.di.resolve("demoService");' }
    ),
    ...pair(
        "no-focused-tests",
        { file: "test/unit/demo.test.ts", code: 'it.only("a", () => {});' },
        { file: "test/unit/demo.test.ts", code: 'it("a", () => {});' }
    ),
    ...pair(
        "type-files",
        { file: MODULE_TYPE, code: "export const A = 1;" },
        { file: MODULE_TYPE, code: "export type A = { a: string };" }
    ),
    ...pair(
        "constant-files",
        { file: MODULE_CONSTANT, code: "export const build = () => 1;" },
        { file: MODULE_CONSTANT, code: "export const DEMO_LIMIT = 10;" }
    ),
    ...pair(
        "return-reply",
        {
            file: HANDLER,
            code: "async function h(reply: R) { reply.send(1); }",
        },
        {
            file: HANDLER,
            code: "async function h(reply: R) { return reply.send(1); }",
        }
    ),
    ...pair(
        "structured-logs",
        { file: SERVICE, code: "log.info(`id ${id}`);" },
        { file: SERVICE, code: 'log.info({ id }, "loaded");' }
    ),
    ...pair(
        "schema-types",
        { file: SCHEMA, code: "type A = { a: string };" },
        {
            file: SCHEMA,
            code: "const aSchema = z.object({}); type A = z.infer<typeof aSchema>;",
        }
    ),
    ...pair(
        "route-shape",
        {
            file: ROUTE,
            code: `fastify.get("/a", ${ROUTE_OPTIONS}, demoHandler.a);`,
        },
        {
            file: ROUTE,
            code: `fastify.get(DemoRoute.Root, ${ROUTE_OPTIONS}, demoHandler.a);`,
        }
    ),
    ...pair(
        "paginate-lists",
        { file: SERVICE, code: "demoRepository.findMany({ where: {} });" },
        { file: SERVICE, code: "demoRepository.findMany({ take: 10 });" }
    ),
    ...pair(
        "handler-imports",
        {
            file: HANDLER,
            code: 'import { messageIdSelect } from "@/database/repositories/message/message.repository.js";',
        },
        {
            file: HANDLER,
            code: 'import type { MessageIdParam } from "@/lib/validation/message/message.schema.js";',
        }
    ),
    ...pair(
        "thin-handlers",
        { file: HANDLER, code: "demoSchema.parse(body);" },
        { file: HANDLER, code: "demoService.load(body);" }
    ),
    ...pair(
        "no-process-env",
        { file: SERVICE, code: "const port = process.env.PORT;" },
        { file: "src/server.ts", code: "const port = process.env.PORT;" }
    ),
    ...pair(
        "typed-errors",
        { file: SERVICE, code: "throw new Error(MESSAGE);" },
        { file: SERVICE, code: "throw new NotFoundError(MESSAGE);" }
    ),
    ...pair(
        "entry-points",
        { file: LIB_UTIL, code: "export default 1;" },
        {
            file: "src/modules/demo/index.ts",
            code: [
                'import type { FastifyInstance } from "fastify";',
                'export const autoPrefix = "/api/demo";',
                "export default async function (fastify: FastifyInstance) { return fastify; }",
            ].join("\n"),
        }
    ),
    ...pair(
        "no-arch-disable",
        {
            file: LIB_UTIL,
            code: "// eslint-disable-next-line arch/no-classes\nexport class A {}",
        },
        {
            file: LIB_UTIL,
            code: "// eslint-disable-next-line no-console\nconsole.log(1);",
        }
    ),
    ...pair(
        "file-layout",
        { file: "src/modules/demo/helpers/demo.ts", code: "const a = 1;" },
        { file: "src/modules/demo/demo.util.ts", code: "const a = 1;" }
    ),
    ...pair(
        "factory-params",
        {
            file: SERVICE,
            code: "export const createService = ({ demoRepository }: Deps): DemoService => ({});",
        },
        {
            file: SERVICE,
            code: "export const createService = (demoRepository: DemoRepository): DemoService => ({});",
        }
    ),
    ...pair(
        "di-files",
        {
            file: SERVICE,
            code: "export const createService = (): DemoService => ({});",
        },
        {
            file: SERVICE,
            code: 'export const createService = (): DemoService => ({});\naddDIResolverName(createService, "demoService");',
        }
    ),
    ...pair(
        "zod-placement",
        { file: SERVICE, code: 'import { z } from "zod";' },
        { file: SERVICE, code: 'import { ZodError } from "zod";' }
    ),
    ...pair(
        "no-barrel-files",
        { file: LIB_UTIL, code: 'export * from "./other.js";' },
        { file: LIB_UTIL, code: "export const a = 1;" }
    ),
    ...pair(
        "no-parent-imports",
        { file: LIB_UTIL, code: 'import { a } from "../x.js";' },
        { file: LIB_UTIL, code: 'import { a } from "@/lib/x.js";' }
    ),
    ...pair(
        "no-classes",
        { file: LIB_UTIL, code: "export class A {}" },
        { file: "src/lib/errors/demo.ts", code: "export class A {}" }
    ),
    ...pair(
        "prisma-imports",
        {
            file: SERVICE,
            code: 'import { PrismaClient } from "@prisma/client";',
        },
        {
            file: SERVICE,
            code: 'import type { PrismaClient } from "@prisma/client";',
        }
    ),
    ...pair(
        "prisma-calls",
        { file: SERVICE, code: "prisma.message.findMany();" },
        { file: SERVICE, code: "prisma.$transaction(async () => 1);" }
    ),
    ...pair(
        "sdk-imports",
        { file: SERVICE, code: 'import axios from "axios";' },
        { file: SERVICE, code: 'import type { AxiosInstance } from "axios";' }
    ),
    ...pair(
        "di-registration",
        { file: LIB_UTIL, code: "container.register({});" },
        { file: "src/plugins/demo.ts", code: "container.register({});" }
    ),
    ...pair(
        "route-constants",
        { file: ROUTE, code: 'export enum DemoRoute { Root = "/" }' },
        { file: ROUTE, code: 'enum DemoRoute { Root = "/" }' }
    ),
    ...pair(
        "max-one-param",
        {
            file: LIB_UTIL,
            code: "export const sum = (a: number, b: number): number => a + b;",
        },
        {
            file: LIB_UTIL,
            code: "export const sum = ({ a, b }: Pair): number => a + b;",
        }
    ),
    ...pair(
        "response-messages",
        { file: SERVICE, code: 'throw new NotFoundError("Not found");' },
        {
            file: SERVICE,
            code: "throw new NotFoundError(RESPONSE_MESSAGES.demo.notFound);",
        }
    ),
    ...pair(
        "no-db-in-loops",
        {
            file: SERVICE,
            code: "for (const id of ids) { await demoRepository.findUnique({ where: { id } }); }",
        },
        {
            file: SERVICE,
            code: "await demoRepository.findMany({ where: { id: { in: ids } }, take: 10 });",
        }
    ),
    ...pair(
        "layer-imports",
        {
            file: SERVICE,
            code: 'import { createMessageRepository } from "@/database/repositories/message/message.repository.js";',
        },
        {
            file: SERVICE,
            code: 'import type { MessageRepository } from "@/database/repositories/message/message.repository.js";',
        }
    ),
    ...pair(
        "no-manual-new",
        { file: SERVICE, code: "const client = new Redis();" },
        { file: SERVICE, code: "const at = new Date();" }
    ),
    ...pair(
        "always-return",
        { file: LIB_UTIL, code: "export function run(): void {}" },
        { file: LIB_UTIL, code: "export function run(): number { return 1; }" }
    ),
    ...pair(
        "types-placement",
        { file: SERVICE, code: "type Payload = { ids: string[] };" },
        { file: SERVICE, code: "type Payload = { id: string };" }
    ),
    ...pair(
        "constants-placement",
        { file: SERVICE, code: "const DEMO_LIMIT = 10;" },
        { file: MODULE_CONSTANT, code: "export const DEMO_LIMIT = 10;" }
    ),
    ...pair(
        "typed-prisma-json",
        { file: MODULE_TYPE, code: "export type M = Prisma.JsonValue;" },
        { file: MODULE_TYPE, code: "export type M = PrismaJson.MessageMeta;" }
    ),
    ...pair(
        "max-comment-lines",
        {
            file: LIB_UTIL,
            code: "// a\n// b\n// c\n// d\n// e\n// f\nconst a = 1;",
        },
        { file: LIB_UTIL, code: "// a\n// b\nconst a = 1;" }
    ),
    ...pair(
        "service-helpers",
        { file: SERVICE, code: "const helper = () => 1;" },
        {
            file: SERVICE,
            code: "export const createService = (): DemoService => ({});\nfunction helper() { return 1; }",
        }
    ),
    ...pair(
        "service-return",
        {
            file: SERVICE,
            code: "export const createService = (): DemoService => { const service = {}; return service; };",
        },
        {
            file: SERVICE,
            code: "export const createService = (): DemoService => { return {}; };",
        }
    ),
];

const TYPE_AWARE_RULES = [
    "@typescript-eslint/no-floating-promises",
    "@typescript-eslint/no-misused-promises",
    "@typescript-eslint/switch-exhaustiveness-check",
    "@typescript-eslint/await-thenable",
    "@typescript-eslint/return-await",
    "import-x/no-cycle",
];

const eslint = new ESLint({
    overrideConfig: {
        languageOptions: { parserOptions: { projectService: false } },
        rules: Object.fromEntries(
            TYPE_AWARE_RULES.map((rule) => [rule, "off"])
        ),
    },
});

const reportedRules = async ({ file, code }: Case): Promise<string[]> => {
    const [result] = await eslint.lintText(code, {
        filePath: path.join(process.cwd(), file),
    });

    const fatal = result.messages.filter((message) => message.fatal);

    expect(fatal, "the fixture must parse").toEqual([]);

    return result.messages.map((message) => message.ruleId ?? "");
};

describe("arch/* ESLint rules", () => {
    const configured = eslint
        .calculateConfigForFile(path.join(process.cwd(), SERVICE))
        .then((config) => Object.keys(config.plugins.arch.rules));

    it("has a case for every registered arch rule", async () => {
        const covered = new Set(CASES.map(({ rule }) => rule));

        expect((await configured).filter((rule) => !covered.has(rule))).toEqual(
            []
        );
    });

    it.each(CASES)("arch/$rule reports=$reports in $file", async (testCase) => {
        const rules = await reportedRules(testCase);

        expect(rules.includes(`arch/${testCase.rule}`)).toBe(testCase.reports);
    });
});
