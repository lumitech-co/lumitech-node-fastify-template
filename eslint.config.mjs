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
        "response-messages": restrictedSyntax,
        "no-db-in-loops": restrictedSyntax,
        "layer-imports": typescriptEslint.rules["no-restricted-imports"],
        "no-manual-new": restrictedSyntax,
        "always-return": restrictedSyntax,
        "types-placement": restrictedSyntax,
        "constants-placement": restrictedSyntax,
        "typed-prisma-json": restrictedSyntax,
    },
};

const ALWAYS_RETURN_MESSAGE =
    "Service methods and our own utils always return a value — no void / side-effect-only functions (CLAUDE.md, Rule 4).";

const TYPES_PLACEMENT_MESSAGE =
    "Only <Name>Service / <Name>Handler and payload types whose fields are all primitive stay here — move the rest to <name>.type.ts (CLAUDE.md, Rule 5).";

const PRIMITIVE_TYPE =
    "TSStringKeyword, TSNumberKeyword, TSBooleanKeyword, TSNullKeyword, TSUndefinedKeyword, TSLiteralType, TSTypeReference[typeName.name='Date']";

const VOID_RETURN_TYPE = ":matches(:function, TSFunctionType) > TSTypeAnnotation.returnType TSVoidKeyword";

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
            "arch/always-return": [
                "warn",
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
                "warn",
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
        },
    },
    {
        files: ["src/modules/**/*.ts"],

        rules: {
            "arch/response-messages": [
                "error",
                {
                    selector:
                        "Property[key.name='message'] > :matches(Literal[value=/[A-Za-z]/], TemplateLiteral:has(TemplateElement[value.raw=/[A-Za-z]/]))",
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
                "warn",
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
                "warn",
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
                "warn",
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
                "warn",
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
