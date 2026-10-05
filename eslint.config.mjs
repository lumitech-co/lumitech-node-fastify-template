import js from "@eslint/js";
import path from "node:path";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import stylistic from "@stylistic/eslint-plugin";
import prettyImports from "eslint-plugin-pretty-imports";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import fileNaming from "./scripts/eslint-rules/file-naming.mjs";
import importX, { createNodeResolver } from "eslint-plugin-import-x";
import noArchDisable from "./scripts/eslint-rules/no-arch-disable.mjs";
import layerDirection from "./scripts/eslint-rules/layer-direction.mjs";
import preferFindUniqueOrFail from "./scripts/eslint-rules/prefer-find-unique-or-fail.mjs";
import noRelationJoinWithCursor from "./scripts/eslint-rules/no-relation-join-with-cursor.mjs";
import transactionViaRepositories from "./scripts/eslint-rules/transaction-via-repositories.mjs";
import maxCommentLines, {
    MAX_COMMENT_LINES,
} from "./scripts/eslint-rules/max-comment-lines.mjs";
import noSingleRepositoryTransaction from "./scripts/eslint-rules/no-single-repository-transaction.mjs";
import noPrismaShapeOutsideRepository from "./scripts/eslint-rules/no-prisma-shape-outside-repository.mjs";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import { builtinRules } from "eslint/use-at-your-own-risk";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Every architecture rule (CLAUDE.md) gets its own name. Core
// no-restricted-syntax / no-restricted-imports can hold only one option set
// per file, so a later block would silently replace an earlier one.
const restrictedSyntax = builtinRules.get("no-restricted-syntax");

const HTTP_METHOD_CALL =
    "CallExpression[callee.object.name='fastify'][callee.property.name=/^(get|post|put|patch|delete|head|options)$/]";

const architecture = {
    rules: {
        "layer-direction": layerDirection,
        "file-naming": fileNaming,
        "transaction-via-repositories": transactionViaRepositories,
        "no-prisma-shape-outside-repository": noPrismaShapeOutsideRepository,
        "prefer-find-unique-or-fail": preferFindUniqueOrFail,
        "no-single-repository-transaction": noSingleRepositoryTransaction,
        "no-relation-join-with-cursor": noRelationJoinWithCursor,
        "no-unsafe-raw-sql": restrictedSyntax,
        "worker-imports": typescriptEslint.rules["no-restricted-imports"],
        "thin-workers": restrictedSyntax,
        "no-focused-tests": restrictedSyntax,
        "type-files": restrictedSyntax,
        "constant-files": restrictedSyntax,
        "return-reply": restrictedSyntax,
        "structured-logs": restrictedSyntax,
        "schema-types": restrictedSyntax,
        "route-shape": restrictedSyntax,
        "paginate-lists": restrictedSyntax,
        "handler-imports": typescriptEslint.rules["no-restricted-imports"],
        "thin-handlers": restrictedSyntax,
        "no-process-env": restrictedSyntax,
        "typed-errors": restrictedSyntax,
        "entry-points": restrictedSyntax,
        "no-arch-disable": noArchDisable,
        "file-layout": restrictedSyntax,
        "factory-params": restrictedSyntax,
        "di-files": restrictedSyntax,
        "zod-placement": typescriptEslint.rules["no-restricted-imports"],
        "no-barrel-files": restrictedSyntax,
        "no-parent-imports": builtinRules.get("no-restricted-imports"),
        "no-classes": restrictedSyntax,
        "prisma-imports": typescriptEslint.rules["no-restricted-imports"],
        "prisma-calls": restrictedSyntax,
        "sdk-imports": typescriptEslint.rules["no-restricted-imports"],
        "di-registration": restrictedSyntax,
        "route-constants": restrictedSyntax,
        "max-one-param": restrictedSyntax,
        "response-messages": restrictedSyntax,
        "no-db-in-loops": restrictedSyntax,
        "layer-imports": typescriptEslint.rules["no-restricted-imports"],
        "no-manual-new": restrictedSyntax,
        "always-return": restrictedSyntax,
        "types-placement": restrictedSyntax,
        "constants-placement": restrictedSyntax,
        "typed-prisma-json": restrictedSyntax,
        "max-comment-lines": maxCommentLines,
        "service-helpers": restrictedSyntax,
        "service-return": restrictedSyntax,
    },
};

const ALWAYS_RETURN_MESSAGE =
    "Service methods and our own utils always return a value — no void / side-effect-only functions (CLAUDE.md, Rule 4).";

const TYPES_PLACEMENT_MESSAGE =
    "Only <Name>Service / <Name>Handler and payload types whose fields are all primitive stay here — move the rest to <name>.type.ts (CLAUDE.md, Rule 5).";

const PRIMITIVE_TYPE =
    "TSStringKeyword, TSNumberKeyword, TSBooleanKeyword, TSNullKeyword, TSUndefinedKeyword, TSLiteralType, TSTypeReference[typeName.name='Date']";

const VOID_RETURN_TYPE =
    ":matches(:function, TSFunctionType) > TSTypeAnnotation.returnType TSVoidKeyword";

const MAX_ONE_PARAM_MESSAGE =
    "Service methods and our own utils take at most one argument — a primitive or a single object (CLAUDE.md, Rule 4).";

const ROUTE_CONSTANTS_MESSAGE =
    "The module tag and route-path enum are declared (not exported) at the top of <name>.route.ts; autoPrefix stays in index.ts (CLAUDE.md, Rule 5).";

const PRISMA_CALLS_MESSAGE =
    "Prisma calls live only in src/database/repositories/**; a service may only open prisma.$transaction (CLAUDE.md, Rule 2).";

const PRISMA_CALLS = [
    "MemberExpression[object.name='prisma'][property.name!='$transaction']",
    "MemberExpression[object.property.name='prisma']",
    "MemberExpression[property.name=/^\\$(queryRaw|executeRaw)(Unsafe)?$/]",
].map((selector) => ({ selector, message: PRISMA_CALLS_MESSAGE }));

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    ...compat.extends(
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ),
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
            "pretty-imports": prettyImports,
            "@stylistic": stylistic,
        },

        languageOptions: {
            globals: {
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
        },

        rules: {
            "pretty-imports/sorted": "warn",

            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/no-use-before-define": "off",

            "no-console": "error",
            "no-inline-comments": "error",

            // log.trace()/log.debug() are suppressed in GCP (logger level is
            // 'info'), so they never reach Cloud Logging yet add noise. Flag
            // them so they aren't committed. `warn` keeps CI/commits green for
            // the existing intentional debug calls.
            "no-restricted-syntax": [
                "warn",
                {
                    // log.trace() / log.debug() — direct logger reference
                    selector:
                        "CallExpression[callee.object.name=/^(log|logger)$/][callee.property.name=/^(trace|debug)$/]",
                    message:
                        "log.trace()/log.debug() are suppressed in GCP (logger level is 'info') and add noise — use log.info() or higher, or remove before committing.",
                },
                {
                    // *.log.trace() / *.log.debug() — request.log, fastify.log, this.log
                    selector:
                        "CallExpression[callee.object.property.name='log'][callee.property.name=/^(trace|debug)$/]",
                    message:
                        "log.trace()/log.debug() are suppressed in GCP (logger level is 'info') and add noise — use log.info() or higher, or remove before committing.",
                },
            ],

            "no-param-reassign": "error",
            "default-case": "off",
            "consistent-return": "off",
            curly: ["error", "all"],
            "no-negated-condition": "error",
            "no-unneeded-ternary": "error",

            "no-magic-numbers": [
                "warn",
                {
                    ignoreArrayIndexes: true,
                    ignore: [
                        0, 1, -1, 200, 201, 202, 204, 400, 401, 403, 404, 409,
                        429, 500,
                    ],
                },
            ],

            "id-denylist": ["error", "cb", "item", "i", "el"],

            "@stylistic/padding-line-between-statements": [
                "warn",
                {
                    blankLine: "always",
                    prev: "*",
                    next: [
                        "multiline-expression",
                        "multiline-const",
                        "return",
                        "try",
                        "block-like",
                        "class",
                        "function",
                        "multiline-block-like",
                    ],
                },
                {
                    blankLine: "always",
                    next: "*",
                    prev: [
                        "multiline-expression",
                        "multiline-const",
                        "return",
                        "try",
                        "block-like",
                        "class",
                        "function",
                        "multiline-block-like",
                    ],
                },
                {
                    blankLine: "any",
                    prev: ["case", "default"],
                    next: ["case", "default", "return"],
                },
            ],
        },
    },
    {
        // configureServer()'s runQueueWorker flag (src/server.ts) excludes
        // the BullMQ consumer from the API server by matching *.worker.ts —
        // any other filename in this tree would silently keep running there.
        files: ["src/plugins/mq/**/*.{ts,js}"],
        ignores: [
            "src/plugins/mq/**/*.worker.{ts,js}",
            "src/plugins/mq/**/*.queue.{ts,js}",
        ],

        rules: {
            "no-restricted-syntax": [
                "error",
                {
                    selector: "Program",
                    message:
                        "src/plugins/mq/** may only contain *.worker.ts (BullMQ consumer) or *.queue.ts (producer) files.",
                },
            ],
        },
    },
    {
        files: ["cli/**", "scripts/**"],

        rules: {
            "no-console": "off",
        },
    },
    {
        files: ["src/**/*.ts"],

        plugins: { "import-x": importX },

        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },

        settings: {
            "import-x/extensions": [".ts", ".js"],
            "import-x/parsers": { "@typescript-eslint/parser": [".ts"] },
            "import-x/resolver-next": [
                createTypeScriptImportResolver({ project: __dirname }),
                createNodeResolver(),
            ],
        },

        rules: {
            "@typescript-eslint/consistent-type-imports": [
                "error",
                { prefer: "type-imports", fixStyle: "separate-type-imports" },
            ],
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/switch-exhaustiveness-check": "error",
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/return-await": ["error", "in-try-catch"],
            eqeqeq: ["error", "always", { null: "ignore" }],
            "import-x/no-cycle": ["error", { ignoreExternal: true }],
        },
    },
    {
        plugins: { arch: architecture },
    },
    {
        files: ["src/**/*.ts"],

        rules: {
            "arch/max-comment-lines": ["warn", { max: MAX_COMMENT_LINES }],
            "arch/no-barrel-files": [
                "error",
                {
                    selector:
                        "ExportAllDeclaration, ExportNamedDeclaration[source]",
                    message:
                        "No barrel files — import directly from the source file (CLAUDE.md, Conventions).",
                },
            ],
            "arch/no-parent-imports": [
                "error",
                {
                    patterns: [
                        {
                            regex: "^\\.\\./",
                            message:
                                "Use the @/ alias instead of ../ imports (CLAUDE.md, Conventions).",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: ["src/lib/errors/**"],

        rules: {
            "arch/no-classes": [
                "error",
                {
                    selector: "ClassDeclaration, ClassExpression",
                    message:
                        "Use factory functions, not classes (CLAUDE.md, Conventions).",
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: ["src/database/**", "src/plugins/prisma.ts", "src/types/**"],

        rules: {
            "arch/prisma-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["@prisma/client", "@prisma/client/*"],
                            allowTypeImports: true,
                            message:
                                "Only `import type` from @prisma/client outside repositories (CLAUDE.md, Rule 2).",
                        },
                    ],
                },
            ],
            "arch/prisma-calls": ["error", ...PRISMA_CALLS],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: [
            "src/database/**",
            "src/plugins/prisma.ts",
            "src/types/**",
            "src/**/*.service.ts",
        ],

        rules: {
            "arch/prisma-calls": [
                "error",
                ...PRISMA_CALLS,
                {
                    selector:
                        "MemberExpression[object.name='prisma'][property.name='$transaction']",
                    message: PRISMA_CALLS_MESSAGE,
                },
            ],
        },
    },
    {
        // mq/*.queue.ts and mq/*.worker.ts are plugin bodies, loaded only
        // by src/plugins/mq/**.
        files: ["src/modules/**/*.ts", "src/database/repositories/**/*.ts"],
        ignores: ["src/modules/**/mq/*.{queue,worker}.ts"],

        rules: {
            "arch/sdk-imports": [
                "error",
                {
                    patterns: [
                        {
                            regex: "^(?!@/|\\.{1,2}/|node:|fastify$|zod$|@prisma/client$).+",
                            allowTypeImports: true,
                            message:
                                "Only @/, ./, node:, fastify, zod and @prisma/client are imported here — any other package reaches handlers/services/repositories through a plugin in src/plugins/; use `import type` (CLAUDE.md, Rule 6).",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: ["src/plugins/**"],

        rules: {
            "arch/di-registration": [
                "error",
                {
                    selector:
                        "CallExpression[callee.property.name=/^(register|loadModules)$/]:matches([callee.object.name=/^(di|container)$/], [callee.object.property.name=/^(di|container)$/])",
                    message:
                        "Container entries are registered only from src/plugins/ (CLAUDE.md, Rule 6).",
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.{ts,js}"],
        ignores: [
            "src/modules/*/index.ts",
            "src/modules/*/*.{route,handler,service,constant,type,util}.ts",
            "src/modules/*/mq/*.{queue,worker,service,constant,type}.ts",
        ],

        rules: {
            "arch/file-layout": [
                "error",
                {
                    selector: "Program",
                    message:
                        "A module holds only index.ts, <name>.{route,handler,service,constant,type,util}.ts and mq/<name>.{queue,worker,service,constant,type}.ts (ARCHITECTURE.md, Directory layout).",
                },
            ],
        },
    },
    {
        files: ["src/database/repositories/**/*.{ts,js}"],
        ignores: [
            "src/database/repositories/*/*.repository.ts",
            "src/database/repositories/generate.repository.ts",
            "src/database/repositories/repository.type.ts",
        ],

        rules: {
            "arch/file-layout": [
                "error",
                {
                    selector: "Program",
                    message:
                        "A repository folder holds only <name>.repository.ts — its types stay in that file, never in a *.type.ts (CLAUDE.md, Rules 0 and 5).",
                },
            ],
        },
    },
    {
        files: ["src/lib/validation/**/*.{ts,js}"],
        ignores: ["src/lib/validation/*/*.schema.ts"],

        rules: {
            "arch/file-layout": [
                "error",
                {
                    selector: "Program",
                    message:
                        "src/lib/validation/<module>/ holds only <module>.schema.ts (CLAUDE.md, Rule 7).",
                },
            ],
        },
    },
    {
        files: ["src/plugins/**/*.{ts,js}"],
        ignores: ["src/plugins/*.ts", "src/plugins/mq/**"],

        rules: {
            "arch/file-layout": [
                "error",
                {
                    selector: "Program",
                    message:
                        "src/plugins/ is flat — the only subfolder is mq/<name>/ (CLAUDE.md, Rule 6).",
                },
            ],
        },
    },
    {
        // CLASSIC injection resolves dependencies by parameter name.
        files: [
            "src/**/*.{service,handler}.ts",
            "src/database/repositories/**/*.repository.ts",
        ],

        rules: {
            "arch/factory-params": [
                "error",
                {
                    selector:
                        "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=/^create/] > :function > :matches(ObjectPattern, ArrayPattern, RestElement, AssignmentPattern)",
                    message:
                        "Awilix (CLASSIC) injects factory dependencies by parameter name — one plain parameter per dependency, no destructuring/defaults/rest (CLAUDE.md, Rule 1).",
                },
            ],
        },
    },
    {
        files: ["src/**/*.service.ts"],

        rules: {
            "arch/di-files": [
                "error",
                {
                    selector:
                        "Program:not(:has(Program > ExportNamedDeclaration VariableDeclarator[id.name=/^create\\w*Service$/]))",
                    message:
                        "A *.service.ts exports its factory as createService (module) or create<Name>Service (lib) (CLAUDE.md, Rule 1).",
                },
                {
                    selector:
                        "Program:not(:has(Program > ExpressionStatement > CallExpression[callee.name='addDIResolverName']))",
                    message:
                        'Register the factory with a top-level addDIResolverName(factory, "name") (CLAUDE.md, Rule 1).',
                },
                {
                    selector:
                        "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=/^create/] > ArrowFunctionExpression:not([returnType])",
                    message:
                        "Annotate the factory's return type with its <Name>Service type.",
                },
            ],
        },
    },
    {
        files: ["src/**/*.handler.ts"],

        rules: {
            "arch/di-files": [
                "error",
                {
                    selector:
                        "Program:not(:has(Program > ExportNamedDeclaration VariableDeclarator[id.name=/^create\\w*Handler$/]))",
                    message:
                        "A *.handler.ts exports its factory as createHandler (CLAUDE.md, Rule 1).",
                },
                {
                    selector:
                        "Program:not(:has(Program > ExpressionStatement > CallExpression[callee.name='addDIResolverName']))",
                    message:
                        'Register the factory with a top-level addDIResolverName(factory, "name") (CLAUDE.md, Rule 1).',
                },
                {
                    selector:
                        "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=/^create/] > ArrowFunctionExpression:not([returnType])",
                    message:
                        "Annotate the factory's return type with its <Name>Handler type.",
                },
            ],
        },
    },
    {
        files: ["src/database/repositories/**/*.repository.ts"],
        ignores: ["src/database/repositories/generate.repository.ts"],

        rules: {
            "arch/di-files": [
                "error",
                {
                    selector:
                        "Program:not(:has(Program > ExportNamedDeclaration VariableDeclarator[id.name=/^create\\w+Repository$/]))",
                    message:
                        "A *.repository.ts exports its factory as create<Name>Repository (CLAUDE.md, Rule 1).",
                },
                {
                    selector:
                        "Program:not(:has(Program > ExpressionStatement > CallExpression[callee.name='addDIResolverName']))",
                    message:
                        'Register the factory with a top-level addDIResolverName(factory, "name") (CLAUDE.md, Rule 1).',
                },
                {
                    selector:
                        "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=/^create/] > ArrowFunctionExpression:not([returnType])",
                    message:
                        "Annotate the factory's return type with its <Name>Repository type.",
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: ["src/lib/validation/**"],

        rules: {
            "arch/zod-placement": [
                "error",
                {
                    paths: [
                        {
                            name: "zod",
                            allowTypeImports: true,
                            allowImportNames: ["ZodError"],
                            message:
                                "Zod schemas live only in src/lib/validation/<module>/<module>.schema.ts — import them from there; elsewhere only `import type` / ZodError (CLAUDE.md, Rule 7).",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],

        rules: {
            "arch/layer-direction": "error",
            "arch/paginate-lists": [
                "warn",
                {
                    selector:
                        "CallExpression[callee.property.name='findMany']:not(:has(Property[key.name='take']))",
                    message:
                        "Every list is paginated — pass `take` (cursor- or skip-based) to findMany (CLAUDE.md, Conventions).",
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.route.ts"],

        rules: {
            "arch/route-shape": [
                "error",
                {
                    selector:
                        "CallExpression[callee.object.name='fastify'][callee.property.name='route']",
                    message:
                        "Declare routes with fastify.<method>(path, { schema }, <name>Handler.<method>), not fastify.route().",
                },
                {
                    selector: `${HTTP_METHOD_CALL}[arguments.2.object.name!=/Handler$/]`,
                    message:
                        "A route is fastify.<method>(path, { schema }, <name>Handler.<method>) — no inline handlers, logic lives in the handler (CLAUDE.md, Conventions).",
                },
                {
                    selector: `${HTTP_METHOD_CALL}:not(:has(Property[key.name='response']))`,
                    message:
                        "Every route declares schema.response with a Zod schema (CLAUDE.md, Rule 7).",
                },
                {
                    selector: `${HTTP_METHOD_CALL}:not(:has(Property[key.name='tags']))`,
                    message:
                        "Every route declares schema.tags with the module tag so it shows up in Swagger.",
                },
                {
                    selector: `${HTTP_METHOD_CALL}:not(:has(Property[key.name='summary']))`,
                    message: "Every route declares schema.summary for Swagger.",
                },
                {
                    selector: `${HTTP_METHOD_CALL} > :matches(Literal, TemplateLiteral):first-child`,
                    message:
                        "Route paths come from the <Name>Route enum declared at the top of this file (CLAUDE.md, Rule 5).",
                },
                {
                    selector:
                        "Property[key.name='tags'] > ArrayExpression > :matches(Literal, TemplateLiteral)",
                    message:
                        "Use the module's <NAME>_TAG constant declared at the top of this file (CLAUDE.md, Rule 5).",
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],

        rules: {
            "arch/file-naming": "error",
            "arch/transaction-via-repositories": "error",
            "arch/no-relation-join-with-cursor": "error",
            "arch/no-unsafe-raw-sql": [
                "error",
                {
                    selector:
                        "CallExpression[callee.property.name=/^\\$(queryRaw|executeRaw)Unsafe$/] > :matches(TemplateLiteral[expressions.length>0], BinaryExpression[operator='+']):first-child",
                    message:
                        "SQL injection: never build the SQL of $queryRawUnsafe / $executeRawUnsafe from values — use the tagged $queryRaw`... ${value}` / $executeRaw`...` form.",
                },
            ],
            "arch/structured-logs": [
                "error",
                {
                    selector:
                        "CallExpression[callee.property.name=/^(trace|debug|info|warn|error|fatal)$/]:matches([callee.object.name=/^(log|logger)$/], [callee.object.property.name='log']) > :matches(TemplateLiteral[expressions.length>0], BinaryExpression[operator='+'])",
                    message:
                        'Log structured data: log.info({ id }, "message") or printf-style log.info("... %s", value) — never interpolate into the message.',
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: ["src/database/**", "src/**/*.d.ts"],

        rules: {
            "arch/no-prisma-shape-outside-repository": "error",
        },
    },
    {
        files: ["src/modules/**/*.ts"],

        rules: {
            "arch/prefer-find-unique-or-fail": "error",
            "arch/no-single-repository-transaction": "error",
        },
    },
    {
        // A worker only wires BullMQ jobs to a service; repositories, storage
        // and the db client stay behind that service — even as types.
        files: ["src/modules/**/mq/*.worker.ts"],

        rules: {
            "arch/worker-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: [
                                "@prisma/client",
                                "@/database/**",
                                "@google-cloud/*",
                                "@aws-sdk/*",
                                "ioredis",
                            ],
                            message:
                                "mq/ workers only define BullMQ jobs and call a service — move repository / storage / db work into a *.service.ts (CLAUDE.md, Rule 6).",
                        },
                    ],
                },
            ],
            "arch/thin-workers": [
                "error",
                {
                    selector:
                        "CallExpression[callee.property.name='resolve'] > Literal[value=/(Repository$|^prisma$|^redis$)/]",
                    message:
                        "A worker resolves a service from the container, never a repository or a client — the job's logic lives in the service.",
                },
            ],
        },
    },
    {
        files: ["src/**/*.type.ts"],

        rules: {
            "arch/type-files": [
                "error",
                {
                    selector:
                        "Program > :not(ImportDeclaration[importKind='type'], ExportNamedDeclaration[exportKind='type'], TSTypeAliasDeclaration, TSInterfaceDeclaration, TSModuleDeclaration)",
                    message:
                        "A *.type.ts holds only types (and `import type`) — values go to *.constant.ts, functions to *.util.ts (CLAUDE.md, Rule 5).",
                },
            ],
        },
    },
    {
        files: ["src/**/*.constant.ts"],

        rules: {
            "no-magic-numbers": "off",
            "arch/constant-files": [
                "error",
                {
                    selector:
                        ":matches(Program, Program > ExportNamedDeclaration) > FunctionDeclaration, :matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator > :function",
                    message:
                        "A *.constant.ts holds values only — helpers go to *.util.ts (CLAUDE.md, Rule 5).",
                },
            ],
        },
    },
    {
        // Without return, an async handler resolves undefined and Fastify may
        // try to send a second reply.
        files: ["src/**/*.handler.ts"],

        rules: {
            "arch/return-reply": [
                "error",
                {
                    selector:
                        "ExpressionStatement > CallExpression[callee.property.name='send']",
                    message:
                        "Return the reply: `return reply.status(...).send(data)`.",
                },
            ],
        },
    },
    {
        files: ["src/lib/validation/**/*.schema.ts"],

        rules: {
            "arch/schema-types": [
                "error",
                {
                    selector:
                        "TSTypeAliasDeclaration:not([typeAnnotation.type='TSTypeReference'][typeAnnotation.typeName.left.name='z'][typeAnnotation.typeName.right.name=/^(infer|input|output)$/])",
                    message:
                        "Types in a schema file are derived with z.infer / z.input / z.output, never written by hand (CLAUDE.md, Rule 7).",
                },
                {
                    selector: "TSInterfaceDeclaration",
                    message:
                        "Types in a schema file are derived with z.infer / z.input / z.output, never written by hand (CLAUDE.md, Rule 7).",
                },
                {
                    selector:
                        "CallExpression[callee.object.name='z'][callee.property.name='any']",
                    message:
                        "z.any() switches validation off — describe the shape, or use z.unknown() and narrow it (CLAUDE.md, Rule 7).",
                },
            ],
        },
    },
    {
        files: ["src/**/*.handler.ts"],

        rules: {
            "arch/handler-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["@/database/**"],
                            message:
                                "Handlers never touch repositories — call the module service (CLAUDE.md, Conventions: keep handlers thin).",
                        },
                        {
                            group: ["@/lib/validation/**"],
                            importNamePattern: "Schema$",
                            message:
                                "Handlers don't use Zod schemas — validation is declared in the route schema; import only the inferred types.",
                        },
                    ],
                },
            ],
            "arch/thin-handlers": [
                "error",
                {
                    selector:
                        "CallExpression[callee.property.name=/^(safe)?[pP]arse(Async)?$/]",
                    message:
                        "Handlers don't validate — the route schema does; business logic belongs in the service (CLAUDE.md, Conventions).",
                },
            ],
        },
    },
    {
        // server.ts reads NODE_ENV before the env plugin loads (CLAUDE.md, Rule 7).
        files: ["src/**/*.ts"],
        ignores: ["src/plugins/env.ts", "src/server.ts"],

        rules: {
            "arch/no-process-env": [
                "error",
                {
                    selector:
                        "MemberExpression[object.name='process'][property.name='env']",
                    message:
                        "Read configuration from the validated `config` (EnvConfig) via the container or fastify.config, never process.env.",
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.ts", "src/database/**/*.ts"],

        rules: {
            "arch/typed-errors": [
                "error",
                {
                    selector:
                        "ThrowStatement > :matches(NewExpression, CallExpression)[callee.name='Error']",
                    message:
                        "Throw a typed error from @/lib/errors/errors.ts (NotFoundError, …) so the error plugin maps it to a status code.",
                },
                {
                    selector:
                        "ThrowStatement > :not(NewExpression, CallExpression, Identifier, MemberExpression, AwaitExpression)",
                    message:
                        "Throw an error object from @/lib/errors/errors.ts, never a literal.",
                },
            ],
        },
    },
    {
        files: ["src/plugins/**/*.ts"],

        rules: {
            "arch/entry-points": [
                "error",
                {
                    selector: "Program:not(:has(ExportDefaultDeclaration))",
                    message:
                        "A plugin file default-exports its plugin: export default fp(configureX, { ... }).",
                },
                {
                    selector:
                        "ExportDefaultDeclaration:not([declaration.type='CallExpression'][declaration.callee.name='fp'])",
                    message:
                        "Wrap the plugin with fastify-plugin: export default fp(configureX, { ... }) (CLAUDE.md, Rule 6).",
                },
            ],
        },
    },
    {
        files: ["src/modules/*/index.ts"],

        rules: {
            "arch/entry-points": [
                "error",
                {
                    selector:
                        "Program:not(:has(ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='autoPrefix'] > Literal))",
                    message:
                        'A module\'s index.ts exports the endpoint prefix as a literal: export const autoPrefix = "/api/..." (CLAUDE.md, Rule 5).',
                },
                {
                    selector: "Program:not(:has(ExportDefaultDeclaration))",
                    message:
                        "A module's index.ts default-exports the plugin that resolves the handler and calls create<Name>Routes.",
                },
                {
                    selector:
                        "Program > :not(ImportDeclaration, ExportDefaultDeclaration, ExportNamedDeclaration[declaration.declarations.0.id.name='autoPrefix'])",
                    message:
                        "A module's index.ts holds only imports, autoPrefix and the default-exported plugin — everything else goes to the module files.",
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: ["src/plugins/**", "src/modules/*/index.ts"],

        rules: {
            "arch/entry-points": [
                "error",
                {
                    selector: "ExportDefaultDeclaration",
                    message:
                        "Named exports only — default exports are for plugins (src/plugins/) and module entry points (src/modules/*/index.ts).",
                },
            ],
        },
    },
    {
        // Architecture rules don't apply to tests — they may use prisma,
        // factories and raw numbers. What does apply is what makes a test lie.
        files: ["test/**/*.ts"],

        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },

        rules: {
            "no-magic-numbers": "off",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "arch/no-focused-tests": [
                "error",
                {
                    selector:
                        "MemberExpression[object.name=/^(it|test|describe|suite)$/][property.name='only']",
                    message:
                        ".only makes CI run this test alone and skip the rest while staying green — remove it before committing.",
                },
            ],
        },
    },
    {
        files: ["**/*.{ts,js,mjs}"],

        rules: {
            "arch/no-arch-disable": "error",
        },
    },
    {
        files: ["src/modules/**/*.route.ts"],

        rules: {
            "arch/route-constants": [
                "error",
                {
                    selector:
                        "ExportNamedDeclaration > TSEnumDeclaration, ExportNamedDeclaration > VariableDeclaration > VariableDeclarator:not([init.type=/^(Arrow)?FunctionExpression$/])",
                    message: ROUTE_CONSTANTS_MESSAGE,
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.constant.ts"],

        rules: {
            "arch/route-constants": [
                "error",
                {
                    selector:
                        "VariableDeclarator[id.name=/(_TAG|_ROUTES?|^autoPrefix)$/], TSEnumDeclaration[id.name=/Routes?$/]",
                    message: ROUTE_CONSTANTS_MESSAGE,
                },
            ],
        },
    },
    {
        // Top-level functions only: callbacks (sort comparators etc.) keep
        // their natural signature. Awilix factories and addDIResolverName
        // are exempt.
        files: ["src/**/*.util.ts", "src/lib/**/*.ts"],
        ignores: ["src/lib/**/*.service.ts", "src/lib/awilix/**"],

        rules: {
            "arch/max-one-param": [
                "error",
                {
                    selector:
                        ":matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator > :function[params.length>1]",
                    message: MAX_ONE_PARAM_MESSAGE,
                },
                {
                    selector:
                        ":matches(Program, Program > ExportNamedDeclaration) > FunctionDeclaration[params.length>1]",
                    message: MAX_ONE_PARAM_MESSAGE,
                },
            ],
            "arch/always-return": [
                "error",
                {
                    selector:
                        ":matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator > :function[expression=false]:not(:has(ReturnStatement[argument]))",
                    message: ALWAYS_RETURN_MESSAGE,
                },
                {
                    selector:
                        ":matches(Program, Program > ExportNamedDeclaration) > FunctionDeclaration:not(:has(ReturnStatement[argument]))",
                    message: ALWAYS_RETURN_MESSAGE,
                },
                { selector: VOID_RETURN_TYPE, message: ALWAYS_RETURN_MESSAGE },
            ],
        },
    },
    {
        files: ["src/**/*.service.ts"],

        rules: {
            "arch/max-one-param": [
                "error",
                {
                    selector:
                        ":matches(:function > ObjectExpression, ReturnStatement > ObjectExpression) > Property > :function[params.length>1]",
                    message: MAX_ONE_PARAM_MESSAGE,
                },
            ],
            "arch/always-return": [
                "error",
                {
                    selector:
                        ":matches(:function > ObjectExpression, ReturnStatement > ObjectExpression) > Property > :function[expression=false]:not(:has(ReturnStatement[argument]))",
                    message: ALWAYS_RETURN_MESSAGE,
                },
                {
                    selector:
                        ":matches(:function > ObjectExpression, ReturnStatement > ObjectExpression) > Property > :function > TSTypeAnnotation.returnType TSVoidKeyword, TSTypeAliasDeclaration[id.name=/Service$/] TSFunctionType > TSTypeAnnotation.returnType TSVoidKeyword",
                    message: ALWAYS_RETURN_MESSAGE,
                },
            ],
            "arch/service-helpers": [
                "error",
                {
                    selector: [
                        "Program > VariableDeclaration > VariableDeclarator > :function",
                        "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name!=/^create/] > :function",
                        "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > :function > BlockStatement > VariableDeclaration > VariableDeclarator > :function",
                    ].join(", "),
                    message:
                        "Outside the returned service object, helpers are declared as `function name() {}`, not as arrow/function-expression constants.",
                },
                {
                    selector:
                        "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > :function > BlockStatement > FunctionDeclaration ~ ReturnStatement",
                    message:
                        "Helper functions in the factory body go after this return, not before it.",
                },
                {
                    selector:
                        "Program > FunctionDeclaration ~ ExportNamedDeclaration[declaration.declarations.0.id.name=/^create/]",
                    message:
                        "File-level helper functions go after the service factory, not before it.",
                },
            ],
            "arch/service-return": [
                "error",
                {
                    selector:
                        "Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > :function > BlockStatement > ReturnStatement[argument.type='Identifier']",
                    message:
                        "Return the service object literal directly — don't build it in a variable first (`return { ... }`).",
                },
            ],
        },
    },
    {
        // Zod issue messages reach the client in the 400 response.
        files: ["src/modules/**/*.ts", "src/lib/validation/**/*.ts"],

        rules: {
            "arch/response-messages": [
                "error",
                {
                    selector:
                        "Property[key.name=/^(message|error)$/] > :matches(Literal[value=/[A-Za-z]/], TemplateLiteral:has(TemplateElement[value.raw=/[A-Za-z]/]))",
                    message:
                        "Client-facing messages come from RESPONSE_MESSAGES in src/lib/messages/messages.constant.ts (CLAUDE.md, Rule 5a).",
                },
                {
                    selector:
                        "CallExpression[callee.property.name=/^(refine|superRefine|check|min|max|length|nonempty|regex|startsWith|endsWith|gt|gte|lt|lte|multipleOf)$/] > :matches(Literal[value=/[A-Za-z]/], TemplateLiteral:has(TemplateElement[value.raw=/[A-Za-z]/])):nth-child(2)",
                    message:
                        "Client-facing messages come from RESPONSE_MESSAGES in src/lib/messages/messages.constant.ts (CLAUDE.md, Rule 5a).",
                },
                {
                    selector:
                        ":matches(NewExpression, CallExpression)[callee.name=/Error$/] > :matches(Literal[value=/[A-Za-z]/], TemplateLiteral:has(TemplateElement[value.raw=/[A-Za-z]/]))",
                    message:
                        "Error messages come from RESPONSE_MESSAGES in src/lib/messages/messages.constant.ts (CLAUDE.md, Rule 5a).",
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],

        rules: {
            "arch/no-db-in-loops": [
                "error",
                {
                    selector:
                        ":matches(ForStatement, ForInStatement, ForOfStatement, WhileStatement, DoWhileStatement) CallExpression[callee.object.name=/Repository$/]",
                    message:
                        "No repository calls inside loops — use a bulk operation or a single transaction (CLAUDE.md, Rule 3).",
                },
                {
                    selector:
                        "CallExpression[callee.property.name=/^(map|forEach|flatMap|reduce|filter|find|some|every)$/] > :function CallExpression[callee.object.name=/Repository$/]",
                    message:
                        "No repository calls inside map/forEach/etc. — use a bulk operation or a single transaction (CLAUDE.md, Rule 3).",
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.ts", "src/database/repositories/**/*.ts"],

        rules: {
            "arch/layer-imports": [
                "error",
                {
                    patterns: [
                        {
                            regex: "\\.(service|repository|handler)(\\.js)?$",
                            importNamePattern: "^create",
                            allowTypeImports: true,
                            message:
                                "Never import-and-call another layer's factory — inject it through the Awilix container (CLAUDE.md, Rule 1).",
                        },
                    ],
                },
            ],
        },
    },
    {
        // mq/*.queue.ts and mq/*.worker.ts are plugin bodies, loaded only
        // by src/plugins/mq/**.
        files: ["src/modules/**/*.ts", "src/database/repositories/**/*.ts"],
        ignores: ["src/modules/**/mq/*.{queue,worker}.ts"],

        rules: {
            "arch/no-manual-new": [
                "error",
                {
                    selector:
                        "NewExpression:not([callee.name=/(Error|^Date|^Map|^Set|^URL)$/])",
                    message:
                        "No manual `new` in handlers/services/repositories — dependencies come from the Awilix container (CLAUDE.md, Rule 1).",
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.{service,handler}.ts"],

        rules: {
            "arch/types-placement": [
                "error",
                {
                    selector: "TSInterfaceDeclaration",
                    message: TYPES_PLACEMENT_MESSAGE,
                },
                {
                    selector:
                        "TSTypeAliasDeclaration:not([id.name=/(Service|Handler)$/]):not([typeAnnotation.type='TSTypeLiteral'])",
                    message: TYPES_PLACEMENT_MESSAGE,
                },
                {
                    selector: `TSTypeAliasDeclaration:not([id.name=/(Service|Handler)$/]) > TSTypeLiteral > TSPropertySignature > TSTypeAnnotation > :not(${PRIMITIVE_TYPE}, TSUnionType)`,
                    message: TYPES_PLACEMENT_MESSAGE,
                },
                {
                    selector: `TSTypeAliasDeclaration:not([id.name=/(Service|Handler)$/]) > TSTypeLiteral > TSPropertySignature > TSTypeAnnotation > TSUnionType > :not(${PRIMITIVE_TYPE})`,
                    message: TYPES_PLACEMENT_MESSAGE,
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: [
            "src/**/*.constant.ts",
            "src/**/*.schema.ts",
            "src/**/*.route.ts",
        ],

        rules: {
            "arch/constants-placement": [
                "error",
                {
                    selector:
                        ":matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator[id.name=/^[A-Z][A-Z0-9_]+$/]",
                    message:
                        "Constants live in *.constant.ts (module) or src/lib/constants/ (global) (CLAUDE.md, Rule 5).",
                },
            ],
        },
    },
    {
        // generate.repository.ts narrows a generic Prisma delegate — casts
        // are the only way to type it.
        files: ["src/modules/**/*.ts", "src/database/repositories/**/*.ts"],
        ignores: ["src/database/repositories/generate.repository.ts"],

        rules: {
            "@typescript-eslint/consistent-type-assertions": [
                "error",
                { assertionStyle: "never" },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: ["src/types/prisma-json.d.ts"],

        rules: {
            "arch/typed-prisma-json": [
                "error",
                {
                    selector:
                        "TSQualifiedName[left.name='Prisma'][right.name=/^(Json|InputJson|NullableJson)/], ImportSpecifier[imported.name=/^(Json|InputJson)(Value|Object|Array)$/]",
                    message:
                        "Type Json columns via prisma-json-types-generator (PrismaJson namespace), never Prisma.Json* (CLAUDE.md, Rule 8).",
                },
            ],
        },
    },
    {
        files: ["**/.eslintrc.{js,cjs}"],

        languageOptions: {
            globals: {
                ...globals.node,
            },

            ecmaVersion: 5,
            sourceType: "commonjs",
        },
    },
];
