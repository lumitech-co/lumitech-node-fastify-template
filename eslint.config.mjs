import js from "@eslint/js";
import path from "node:path";
import globals from "globals";
import vitest from "@vitest/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import stylistic from "@stylistic/eslint-plugin";
import prettyImports from "eslint-plugin-pretty-imports";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import fileNaming from "./scripts/eslint-rules/file-naming.mjs";
import importX, { createNodeResolver } from "eslint-plugin-import-x";
import noArchDisable from "./scripts/eslint-rules/no-arch-disable.mjs";
import layerDirection from "./scripts/eslint-rules/layer-direction.mjs";
import routeParamsSchema from "./scripts/eslint-rules/route-params-schema.mjs";
import noPassThroughHelper from "./scripts/eslint-rules/no-pass-through-helper.mjs";
import preferRepositoryOrFail from "./scripts/eslint-rules/prefer-repository-or-fail.mjs";
import noRelationJoinWithCursor from "./scripts/eslint-rules/no-relation-join-with-cursor.mjs";
import noDuplicateRepositoryRead from "./scripts/eslint-rules/no-duplicate-repository-read.mjs";
import transactionViaRepositories from "./scripts/eslint-rules/transaction-via-repositories.mjs";
import inlineUnsharedServiceMethod from "./scripts/eslint-rules/inline-unshared-service-method.mjs";
import maxCommentLines, {
    MAX_COMMENT_LINES,
} from "./scripts/eslint-rules/max-comment-lines.mjs";
import noSingleRepositoryTransaction from "./scripts/eslint-rules/no-single-repository-transaction.mjs";
import noDependencyFreeFactoryHelper from "./scripts/eslint-rules/no-dependency-free-factory-helper.mjs";
import noPrismaShapeOutsideRepository from "./scripts/eslint-rules/no-prisma-shape-outside-repository.mjs";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";
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
        "no-single-repository-transaction": noSingleRepositoryTransaction,
        "no-relation-join-with-cursor": noRelationJoinWithCursor,
        "no-duplicate-repository-read": noDuplicateRepositoryRead,
        "no-dependency-free-factory-helper": noDependencyFreeFactoryHelper,
        "no-pass-through-helper": noPassThroughHelper,
        "inline-unshared-service-method": inlineUnsharedServiceMethod,
        "no-unsafe-raw-sql": restrictedSyntax,
        "worker-imports": typescriptEslint.rules["no-restricted-imports"],
        "thin-workers": restrictedSyntax,
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
        "no-http-in-services": typescriptEslint.rules["no-restricted-imports"],
        "decorate-in-plugins": restrictedSyntax,
        "no-process-exit": restrictedSyntax,
        "no-math-random": restrictedSyntax,
        "node-protocol": restrictedSyntax,
        "parse-external-data": restrictedSyntax,
        "bounded-pagination": restrictedSyntax,
        "route-params-schema": routeParamsSchema,
        "plugin-names": restrictedSyntax,
        "no-interfaces": restrictedSyntax,
        "log-error-key": restrictedSyntax,
        "response-envelope": restrictedSyntax,
        "route-registrar": restrictedSyntax,
        "repository-select": restrictedSyntax,
        "repository-layout": restrictedSyntax,
        "domain-repository-types": restrictedSyntax,
        "domain-repository-imports":
            typescriptEslint.rules["no-restricted-imports"],
        "prefer-repository-or-fail": preferRepositoryOrFail,
        "no-prisma-in-modules": restrictedSyntax,
        "public-api": restrictedSyntax,
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
    "Prisma calls live only in a module's *.repository.ts; a service may only open prisma.$transaction (CLAUDE.md, Rule 2).";

const PRISMA_CALLS = [
    "MemberExpression[object.name='prisma'][property.name!='$transaction']",
    "MemberExpression[object.property.name='prisma']",
    "MemberExpression[property.name=/^\\$(queryRaw|executeRaw)(Unsafe)?$/]",
].map((selector) => ({ selector, message: PRISMA_CALLS_MESSAGE }));

const NODE_BUILTIN = builtinModules
    .filter((name) => /^[a-z]/.test(name) && !/[/:]/.test(name))
    .join("|");

const MAX_DEPTH = 3;
const MAX_COMPLEXITY = 10;
const MAX_FILE_LINES = 300;

const LOG_CALL =
    "CallExpression[callee.property.name=/^(trace|debug|info|warn|error|fatal)$/]:matches([callee.object.name=/^(log|logger)$/], [callee.object.property.name='log'])";

const MESSAGE_LITERAL =
    ":matches(Literal[value=/[A-Za-z]/], TemplateLiteral:has(TemplateElement[value.raw=/[A-Za-z]/]))";

// Zod checks whose first argument may be the error message.
const ZOD_MESSAGE_FIRST =
    "^(string|number|boolean|bigint|date|email|url|httpUrl|uuid|uuidv4|uuidv6|uuidv7|guid|cuid|cuid2|ulid|nanoid|xid|ksuid|ipv4|ipv6|cidrv4|cidrv6|base64|base64url|e164|jwt|emoji|datetime|time|duration|int|int32|positive|negative|nonnegative|nonpositive|finite|safe|nonempty)$";

const PARSE_CALL =
    "CallExpression[callee.property.name=/^(safe)?[pP]arse(Async)?$/]";

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    { ignores: ["build/**", "coverage/**"] },
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
            "@typescript-eslint/only-throw-error": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/no-deprecated": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-return": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-unnecessary-condition": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "error",
            "@typescript-eslint/prefer-optional-chain": "error",
            "@typescript-eslint/no-unnecessary-type-assertion": "error",
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: "default",
                    format: ["camelCase"],
                    leadingUnderscore: "allow",
                },
                {
                    selector: "variable",
                    modifiers: ["const"],
                    format: ["camelCase", "UPPER_CASE"],
                    leadingUnderscore: "allowDouble",
                },
                {
                    selector: "variable",
                    modifiers: ["const"],
                    filter: { regex: "Error$", match: true },
                    format: ["PascalCase"],
                },
                {
                    selector: ["variable", "parameter"],
                    modifiers: ["destructured"],
                    format: null,
                },
                { selector: "typeLike", format: ["PascalCase"] },
                { selector: "enumMember", format: ["PascalCase"] },
                { selector: "import", format: null },
                {
                    selector: ["objectLiteralProperty", "typeProperty"],
                    format: null,
                },
            ],
            eqeqeq: ["error", "always", { null: "ignore" }],
            "import-x/no-cycle": ["error", { ignoreExternal: true }],
            "import-x/no-extraneous-dependencies": [
                "error",
                { devDependencies: false },
            ],
            "import-x/no-duplicates": "error",
            "import-x/no-self-import": "error",
            "import-x/no-useless-path-segments": "error",
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
        ignores: [
            "src/database/**",
            "src/plugins/prisma.ts",
            "src/types/**",
            "src/modules/**/*.repository.ts",
        ],

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
            "src/modules/**/*.repository.ts",
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
        files: ["src/modules/**/*.ts"],
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
            "src/modules/*/{index,public}.ts",
            "src/modules/*/*.{route,handler,service,repository,schema,constant,type,util}.ts",
            "src/modules/*/mq/*.{queue,worker,service,constant,type}.ts",
        ],

        rules: {
            "arch/file-layout": [
                "error",
                {
                    selector: "Program",
                    message:
                        "A module holds only index.ts, public.ts, <name>.{route,handler,service,schema,constant,type,util}.ts, <entity>.repository.ts and mq/<name>.{queue,worker,service,constant,type}.ts (ARCHITECTURE.md, Directory layout).",
                },
            ],
        },
    },
    {
        // Repositories live in their module (src/modules/<name>/*.repository.ts).
        files: ["src/database/**/*.{ts,js}"],

        rules: {
            "arch/file-layout": [
                "error",
                {
                    selector: "Program",
                    message:
                        "src/database/ holds only the Prisma schema and migrations — repositories live in their module (CLAUDE.md, Rule 2).",
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
                        "src/lib/validation/<lib>/ holds only <lib>.schema.ts — module schemas live in the module (CLAUDE.md, Rule 7).",
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
            "src/modules/**/*.repository.ts",
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
        files: ["src/modules/**/*.repository.ts"],

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
        ignores: ["src/lib/validation/**", "src/modules/*/*.schema.ts"],

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
                                "Zod schemas live only in src/modules/<name>/<name>.schema.ts (or src/lib/validation/<lib>/ for lib code) — import them from there; elsewhere only `import type` / ZodError (CLAUDE.md, Rule 7).",
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
            "arch/no-duplicate-repository-read": "error",
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
                    selector: `${LOG_CALL} > :matches(TemplateLiteral[expressions.length>0], BinaryExpression[operator='+'])`,
                    message:
                        'Log structured data: log.info({ id }, "message") or printf-style log.info("... %s", value) — never interpolate into the message.',
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: [
            "src/database/**",
            "src/**/*.d.ts",
            "src/modules/**/*.repository.ts",
        ],

        rules: {
            "arch/no-prisma-shape-outside-repository": "error",
        },
    },
    {
        // The shape of a DI factory body: helpers inside it close over its
        // dependencies, pure ones live outside, and nothing is a bare hop.
        files: ["src/**/*.service.ts", "src/modules/**/*.repository.ts"],

        rules: {
            "arch/no-dependency-free-factory-helper": "error",
            "arch/no-pass-through-helper": "error",
            "arch/inline-unshared-service-method": "error",
        },
    },
    {
        files: ["src/modules/**/*.ts"],

        rules: {
            "arch/no-single-repository-transaction": "error",
            "arch/prefer-repository-or-fail": "error",
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
                                "@/modules/**/*.repository.js",
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
        files: [
            "src/lib/validation/**/*.schema.ts",
            "src/modules/*/*.schema.ts",
        ],

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
                            group: [
                                "@/database/**",
                                "./*.repository.js",
                                "@/modules/**/*.repository.js",
                            ],
                            message:
                                "Handlers never touch repositories — call the module service (CLAUDE.md, Conventions: keep handlers thin).",
                        },
                        {
                            group: ["@/lib/validation/**", "./*.schema.js"],
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
                {
                    selector:
                        ":matches(IfStatement, SwitchStatement, TryStatement, ConditionalExpression, ForStatement, ForInStatement, ForOfStatement, WhileStatement, DoWhileStatement)",
                    message:
                        "A handler only calls the service and returns reply.status().send() — branching, loops and error handling belong in the service or the error plugin (CLAUDE.md, Conventions).",
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

        plugins: { vitest },

        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },

        rules: {
            "no-magic-numbers": "off",
            "@typescript-eslint/consistent-type-imports": [
                "error",
                { prefer: "type-imports", fixStyle: "separate-type-imports" },
            ],
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            ...vitest.configs.recommended.rules,
            "vitest/no-disabled-tests": "error",
            "vitest/expect-expect": [
                "error",
                { assertFunctionNames: ["expect", "expectTypeOf"] },
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
                {
                    selector: `CallExpression[callee.property.name='send'] > ${MESSAGE_LITERAL}`,
                    message:
                        "Client-facing messages come from RESPONSE_MESSAGES in src/lib/messages/messages.constant.ts (CLAUDE.md, Rule 5a).",
                },
                {
                    selector: `CallExpression[callee.property.name=/${ZOD_MESSAGE_FIRST}/] > ${MESSAGE_LITERAL}:first-child`,
                    message:
                        "Client-facing messages come from RESPONSE_MESSAGES in src/lib/messages/messages.constant.ts (CLAUDE.md, Rule 5a).",
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
                        ":matches(ForStatement, ForInStatement, ForOfStatement, WhileStatement, DoWhileStatement) CallExpression:matches([callee.object.name=/Repository$/], [callee.object.object.name=/^(prisma|tx)$/])",
                    message:
                        "No repository or Prisma calls inside loops — use a bulk operation or a single transaction (CLAUDE.md, Rule 3).",
                },
                {
                    selector:
                        "CallExpression[callee.property.name=/^(map|forEach|flatMap|reduce|filter|find|some|every)$/] > :function CallExpression:matches([callee.object.name=/Repository$/], [callee.object.object.name=/^(prisma|tx)$/])",
                    message:
                        "No repository or Prisma calls inside map/forEach/etc. — use a bulk operation or a single transaction (CLAUDE.md, Rule 3).",
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.ts"],

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
        files: ["src/modules/**/*.ts"],
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
        files: ["src/modules/**/*.ts"],

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
        // HTTP stays in handlers — services, repositories and queue code get
        // plain data, so they also run from workers and tests.
        files: [
            "src/**/*.service.ts",
            "src/modules/**/*.repository.ts",
            "src/modules/**/mq/*.ts",
        ],

        rules: {
            "arch/no-http-in-services": [
                "error",
                {
                    paths: [
                        {
                            name: "fastify",
                            importNames: ["FastifyRequest", "FastifyReply"],
                            message:
                                "Services, repositories and mq/ never see the HTTP request/reply — the handler passes plain data (CLAUDE.md, Conventions: keep handlers thin).",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],
        ignores: ["src/plugins/**", "src/modules/**/mq/*.queue.ts"],

        rules: {
            "arch/decorate-in-plugins": [
                "error",
                {
                    selector:
                        "CallExpression[callee.property.name=/^decorate(Request|Reply)?$/]",
                    message:
                        "Fastify is decorated only from a plugin in src/plugins/ (CLAUDE.md, Rule 6).",
                },
            ],
        },
    },
    {
        // Exiting anywhere else skips graceful shutdown and drops in-flight
        // BullMQ jobs.
        files: ["src/**/*.ts"],
        ignores: ["src/index.ts", "src/server.ts", "src/worker.ts"],

        rules: {
            "arch/no-process-exit": [
                "error",
                {
                    selector:
                        "CallExpression[callee.object.name='process'][callee.property.name='exit']",
                    message:
                        "Only the entry points (index.ts, server.ts, worker.ts) call process.exit — throw an error instead.",
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],

        rules: {
            "arch/no-math-random": [
                "error",
                {
                    selector:
                        "MemberExpression[object.name='Math'][property.name='random']",
                    message:
                        "Math.random is not cryptographically secure — use randomUUID / randomInt / randomBytes from node:crypto.",
                },
            ],
        },
    },
    {
        // Fastify requires a plugin body to be async even when it awaits nothing.
        files: [
            "src/plugins/**/*.ts",
            "src/modules/*/index.ts",
            "src/modules/**/mq/*.{queue,worker}.ts",
        ],

        rules: {
            "@typescript-eslint/require-await": "off",
        },
    },
    {
        // Sequential I/O in business code is almost always an N+1; cursor and
        // polling loops in src/lib/ are sequential by design.
        files: ["src/modules/**/*.ts", "src/database/**/*.ts"],

        rules: {
            "no-await-in-loop": "error",
        },
    },
    {
        files: ["src/**/*.ts"],

        rules: {
            "arch/node-protocol": [
                "error",
                {
                    selector: `:matches(ImportDeclaration, ImportExpression, ExportNamedDeclaration, ExportAllDeclaration) > Literal.source[value=/^(${NODE_BUILTIN})([^\\w-]|$)/]`,
                    message:
                        'Import Node built-ins with the node: prefix — "node:fs", not "fs".',
                },
            ],
        },
    },
    {
        // Rule 7: JSON from Redis, HTTP responses or files is untrusted.
        files: ["src/**/*.ts"],

        rules: {
            "arch/parse-external-data": [
                "error",
                {
                    selector: `CallExpression[callee.object.name='JSON'][callee.property.name='parse']:not(${PARSE_CALL} > CallExpression)`,
                    message:
                        "Validate parsed JSON right away: schema.parse(JSON.parse(raw)) (CLAUDE.md, Rule 7).",
                },
                {
                    selector: `AwaitExpression[argument.callee.property.name='json'][argument.arguments.length=0]:not(${PARSE_CALL} > AwaitExpression)`,
                    message:
                        "Validate the response body right away: schema.parse(await response.json()) (CLAUDE.md, Rule 7).",
                },
            ],
        },
    },
    {
        files: [
            "src/lib/validation/**/*.schema.ts",
            "src/modules/*/*.schema.ts",
        ],

        rules: {
            "arch/bounded-pagination": [
                "error",
                {
                    selector:
                        "Property[key.name=/^(limit|take|pageSize|perPage)$/]:not(:has(CallExpression[callee.property.name='max']))",
                    message:
                        "A page size is bounded — add .max(...) so a client cannot request the whole table (CLAUDE.md, Conventions: paginate all lists).",
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.route.ts"],

        rules: {
            "arch/route-params-schema": "error",
        },
    },
    {
        // A typo in a literal name only fails when the server boots.
        files: ["src/plugins/**/*.ts"],

        rules: {
            "arch/plugin-names": [
                "error",
                {
                    selector:
                        "CallExpression[callee.name='fp'] > ObjectExpression > Property[key.name=/^(name|dependencies)$/] :matches(Literal, TemplateLiteral)",
                    message:
                        "Plugin names and dependencies come from the FastifyPlugin enum in src/lib/constants/fastify.constant.ts (CLAUDE.md, Rule 6).",
                },
            ],
        },
    },
    {
        // Code style the codebase already follows — locked in so it cannot drift.
        files: ["src/**/*.ts", "test/**/*.ts"],

        rules: {
            "@typescript-eslint/method-signature-style": ["error", "property"],
            "@typescript-eslint/array-type": ["error", { default: "array" }],
            "@typescript-eslint/consistent-type-exports": "error",
            "@typescript-eslint/no-unnecessary-template-expression": "error",
            "@typescript-eslint/prefer-promise-reject-errors": "error",
            "@typescript-eslint/prefer-includes": "error",
            "@typescript-eslint/no-confusing-void-expression": "error",
            "@typescript-eslint/prefer-string-starts-ends-with": "error",
            "@typescript-eslint/restrict-template-expressions": "error",
            "no-else-return": "error",
            "no-lonely-if": "error",
            "no-nested-ternary": "error",
            "no-useless-return": "error",
            "max-depth": ["error", MAX_DEPTH],
            "arrow-body-style": ["error", "as-needed"],
            "object-shorthand": "error",
            "prefer-template": "error",
        },
    },
    {
        // Module augmentation (declare module / global / namespace) needs
        // interfaces; everywhere else the codebase writes `type`.
        files: ["src/**/*.ts", "test/**/*.ts"],

        rules: {
            "arch/no-interfaces": [
                "error",
                {
                    selector:
                        "TSInterfaceDeclaration:not(TSModuleDeclaration TSInterfaceDeclaration)",
                    message:
                        "Use `type` — interfaces are only for augmenting a module (declare module / declare global).",
                },
            ],
        },
    },
    {
        files: ["src/**/*.ts"],

        rules: {
            "@typescript-eslint/explicit-module-boundary-types": "error",
            complexity: ["warn", MAX_COMPLEXITY],
            "max-lines": [
                "warn",
                {
                    max: MAX_FILE_LINES,
                    skipBlankLines: true,
                    skipComments: true,
                },
            ],
        },
    },
    {
        // Pino serializes an Error only under `err`; under any other key it
        // is logged as {} and the message and stack are lost.
        files: ["src/**/*.ts"],

        rules: {
            "arch/log-error-key": [
                "error",
                {
                    selector: `${LOG_CALL} > ObjectExpression:first-child > Property[key.name='error']`,
                    message:
                        'Log errors under `err`: log.error({ err: error }, "...") — pino serializes Error objects only under that key.',
                },
            ],
        },
    },
    {
        // healthCheck answers probes with a bare string; cached is the cache
        // plugin's storage shape, not an HTTP response.
        files: [
            "src/lib/validation/**/*.schema.ts",
            "src/modules/*/*.schema.ts",
        ],

        rules: {
            "arch/response-envelope": [
                "error",
                {
                    selector:
                        "VariableDeclarator[id.name=/ResponseSchema$/]:not([id.name=/^(healthCheck|cached)ResponseSchema$/]):not(:has(> CallExpression[callee.object.name='z'][callee.property.name='object']:has(> ObjectExpression:has(> Property[key.name='message']):has(> Property[key.name='data']))))",
                    message:
                        "A response schema is the envelope z.object({ message, data }) so every endpoint answers in the same shape.",
                },
            ],
        },
    },
    {
        files: ["src/modules/*/*.route.ts"],

        rules: {
            "arch/route-registrar": [
                "error",
                {
                    selector:
                        "Program:not(:has(Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=/^create\\w+Routes$/]))",
                    message:
                        "A <name>.route.ts exports its registrar as create<Name>Routes(fastify, <name>Handler) (CLAUDE.md, Rule 1).",
                },
            ],
        },
    },
    {
        files: ["src/modules/*/index.ts"],

        rules: {
            "arch/route-registrar": [
                "error",
                {
                    selector:
                        "Program:not(:has(CallExpression[callee.property.name='resolve'][callee.object.property.name='di'] > Literal[value=/Handler$/]))",
                    message:
                        'A module\'s index.ts resolves its handler from the container — fastify.di.resolve("<name>Handler") — and passes it to create<Name>Routes (CLAUDE.md, Rule 1).',
                },
            ],
        },
    },
    {
        // A call that forwards an args variable instead of an object
        // literal inherits that variable's select.
        files: ["src/modules/**/*.repository.ts"],

        rules: {
            "arch/repository-select": [
                "error",
                {
                    selector:
                        "CallExpression[callee.property.name=/^(find(Many|First|Unique)(OrThrow)?|create|update|upsert|delete)$/][arguments.0.type='ObjectExpression']:not(:has(> ObjectExpression:has(> Property[key.name='select'])))",
                    message:
                        "Pass a select so a repository returns only the columns its domain type declares — a whole row (password hashes, internal flags) must never leave the repository.",
                },
            ],
        },
    },
    {
        // Rule 5: a repository file holds its <Name>Repository type, the
        // factory, select constants and private Prisma helpers declared as
        // `function name() {}`; domain types go to the module's type file.
        files: ["src/modules/*/*.repository.ts"],

        rules: {
            "arch/repository-layout": [
                "error",
                {
                    selector:
                        "TSTypeAliasDeclaration:not([id.name=/Repository$/])",
                    message:
                        "Only the <Name>Repository type stays in the repository file — domain types go to the module's <name>.type.ts (CLAUDE.md, Rule 5).",
                },
                {
                    selector: [
                        "Program > ExportNamedDeclaration > FunctionDeclaration",
                        ":matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator[id.name!=/^create\\w+Repository$/] > :function",
                    ].join(", "),
                    message:
                        "A repository's Prisma helpers stay private in its file as `function name() {}` — never exported, never in the module's util.ts (CLAUDE.md, Rule 5).",
                },
            ],
        },
    },
    {
        // A repository speaks the domain: its method inputs and outputs are
        // our own types, so services never see Prisma. Selects, where
        // clauses and other Prisma shapes stay inside the factory body.
        files: ["src/modules/**/*.type.ts"],

        rules: {
            "arch/domain-repository-types": [
                "error",
                {
                    selector:
                        "ImportDeclaration[source.value=/^@prisma.client/]",
                    message:
                        "Module types are domain models — describe the shape yourself, don't import it from @prisma/client.",
                },
                {
                    selector:
                        ":matches(TSQualifiedName[left.name='Prisma'], TSTypeReference[typeName.name=/^Prisma(Client|Promise)?$/])",
                    message:
                        "Module types are domain models — describe the shape yourself instead of Prisma.* types.",
                },
            ],
        },
    },
    {
        files: ["src/modules/*/*.repository.ts"],

        rules: {
            "arch/domain-repository-types": [
                "error",
                {
                    selector:
                        "TSTypeAliasDeclaration[id.name=/Repository$/] :matches(TSQualifiedName[left.name='Prisma'][right.name!='TransactionClient'], TSTypeReference[typeName.name=/^Prisma(Client|Promise)?$/])",
                    message:
                        "<Name>Repository methods take and return the module's domain types — keep Prisma inside the factory (Prisma.TransactionClient is the one exception, Rule 2).",
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.ts"],
        ignores: ["src/modules/**/*.repository.ts"],

        rules: {
            "arch/domain-repository-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: [
                                "./*.repository.js",
                                "@/modules/**/*.repository.js",
                            ],
                            allowTypeImports: true,
                            message:
                                "Modules use a repository only through its injected type — never import its selects or other values.",
                        },
                    ],
                },
            ],
        },
    },
    {
        // Modules work with domain types only. A service opening
        // prisma.$transaction (Rule 2) is the one place that names
        // PrismaClient and Prisma.TransactionClient.
        files: ["src/modules/**/*.ts"],
        ignores: ["src/modules/**/*.repository.ts"],

        rules: {
            "arch/no-prisma-in-modules": [
                "error",
                {
                    selector:
                        "TSQualifiedName[left.name='Prisma'][right.name!='TransactionClient']",
                    message:
                        "Modules never see Prisma types — take and return the repository's domain types (CLAUDE.md, Rule 2).",
                },
            ],
        },
    },
    {
        files: ["src/modules/**/*.ts"],
        ignores: [
            "src/modules/**/*.service.ts",
            "src/modules/**/*.repository.ts",
        ],

        rules: {
            "arch/no-prisma-in-modules": [
                "error",
                {
                    selector:
                        "TSQualifiedName[left.name='Prisma'][right.name!='TransactionClient'], ImportDeclaration[source.value=/^@prisma.client/]",
                    message:
                        "Only a repository, or a service opening prisma.$transaction, imports from @prisma/client — everything else in a module uses domain types (CLAUDE.md, Rule 2).",
                },
            ],
        },
    },
    {
        // A module's public.ts is its one sanctioned barrel: the types other
        // modules may depend on, re-exported with `export type { … } from`.
        files: ["src/modules/*/public.ts"],

        rules: {
            "arch/no-barrel-files": "off",
            "arch/public-api": [
                "error",
                {
                    selector:
                        "Program > :not(ExportNamedDeclaration[exportKind='type'][source])",
                    message:
                        'public.ts only re-exports types: `export type { … } from "./<name>.<kind>.js"` — other modules get services through the container (CLAUDE.md, Rule 1).',
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
