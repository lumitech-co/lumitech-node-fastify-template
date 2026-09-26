import js from "@eslint/js";
import path from "node:path";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import stylisticJs from "@stylistic/eslint-plugin-js";
import prettyImports from "eslint-plugin-pretty-imports";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import { builtinRules } from "eslint/use-at-your-own-risk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Every architecture rule (CLAUDE.md) gets its own name. Core
// no-restricted-syntax / no-restricted-imports can hold only one option set
// per file, so a later block would silently replace an earlier one.
const restrictedSyntax = builtinRules.get("no-restricted-syntax");

const architecture = {
    rules: {
        "no-barrel-files": restrictedSyntax,
        "no-parent-imports": builtinRules.get("no-restricted-imports"),
        "no-classes": restrictedSyntax,
        "prisma-imports": typescriptEslint.rules["no-restricted-imports"],
        "prisma-calls": restrictedSyntax,
        "sdk-imports": typescriptEslint.rules["no-restricted-imports"],
        "di-registration": restrictedSyntax,
        "repository-files": restrictedSyntax,
        "route-constants": restrictedSyntax,
        "max-one-param": restrictedSyntax,
    },
};

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
            "@stylistic/js": stylisticJs,
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

            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-use-before-define": "off",

            indent: ["error", 4],
            "linebreak-style": ["error", "unix"],
            quotes: ["error", "double", "avoid-escape"],
            semi: ["error", "always"],

            "no-console": "warn",

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
                        0, 1, -1, 200, 201, 204, 400, 401, 403, 404, 409, 500,
                    ],
                },
            ],

            "id-denylist": ["error", "cb", "item", "i", "el"],

            "padding-line-between-statements": [
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
        plugins: { arch: architecture },
    },
    {
        files: ["src/**/*.ts"],

        rules: {
            "arch/no-barrel-files": [
                "error",
                {
                    selector: "ExportAllDeclaration, ExportNamedDeclaration[source]",
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
                            regex: "^(awilix|bullmq|ioredis|redis|@aws-sdk/.+|@google-cloud/.+)$",
                            allowTypeImports: true,
                            message:
                                "Third-party clients reach handlers/services/repositories only through a plugin in src/plugins/ — use `import type` here (CLAUDE.md, Rule 6).",
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
        files: ["src/database/repositories/**/*.type.ts"],
        ignores: ["src/database/repositories/repository.type.ts"],

        rules: {
            "arch/repository-files": [
                "error",
                {
                    selector: "Program",
                    message:
                        "A repository never gets its own *.type.ts — keep its types in the repository file (CLAUDE.md, Rule 5).",
                },
            ],
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
