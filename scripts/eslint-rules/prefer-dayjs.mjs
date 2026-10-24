/**
 * Keeps dayjs the only date API. Native `Date` survives only as a TYPE and as
 * the transport value Prisma / zod / JSON hand over — constructing one, reading
 * or mutating its fields, or importing dayjs around the wrapper is reported.
 * The wrapper `src/lib/dayjs/dayjs.util.ts` registers the plugins and is exempt. Ported from tolmete-api.
 *
 * Syntactic only (the api ESLint builds no TypeScript program), so native
 * methods are matched by NAME. `toLocaleString` is deliberately absent: numbers
 * have it too.
 *
 * Also guards raw SQL: `Prisma.sql` / `$queryRaw` accept `unknown`, so a Dayjs
 * interpolated there compiles and serializes wrongly — it must end in
 * `.toDate()`.
 *
 * @type {import("eslint").Rule.RuleModule}
 */

const WRAPPER_SUFFIX = "src/lib/dayjs/dayjs.util.ts";

const GETTER_UNITS = {
    FullYear: ".year()",
    Month: ".month()",
    Date: ".date()",
    Day: ".day()",
    Hours: ".hour()",
    Minutes: ".minute()",
    Seconds: ".second()",
    Milliseconds: ".millisecond()",
};

const SETTER_UNITS = [
    "FullYear",
    "Month",
    "Date",
    "Hours",
    "Minutes",
    "Seconds",
    "Milliseconds",
];

const FORMAT_REPLACEMENT =
    "`dayjs(d).format(...)` / the date helpers in `src/lib/utils/date.util.ts`";

const NATIVE_METHODS = new Map([
    ["getTime", "`dayjs(d).valueOf()`"],
    ["getTimezoneOffset", "`dayjs(d).utcOffset()`"],
    ...Object.entries(GETTER_UNITS).flatMap(([unit, getter]) => [
        [`get${unit}`, `\`dayjs(d)${getter}\``],
        [`getUTC${unit}`, `\`dayjs.utc(d)${getter}\``],
    ]),
    ...SETTER_UNITS.flatMap((unit) => [
        [`set${unit}`, "`dayjs(d).set(...)` / `.add(...)` / `.startOf(...)`"],
        [
            `setUTC${unit}`,
            "`dayjs.utc(d).set(...)` / `.add(...)` / `.startOf(...)`",
        ],
    ]),
    ["setTime", "`dayjs(ms)`"],
    ["toLocaleDateString", FORMAT_REPLACEMENT],
    ["toLocaleTimeString", FORMAT_REPLACEMENT],
    ["toDateString", FORMAT_REPLACEMENT],
    ["toTimeString", FORMAT_REPLACEMENT],
    ["toUTCString", FORMAT_REPLACEMENT],
]);

const DATE_STATICS = { now: "dateNow", UTC: "dateUtc", parse: "dateParse" };

const RAW_SQL_TAGS = new Set(["sql", "$queryRaw", "$executeRaw"]);

const RAW_SQL_UNSAFE_CALLS = new Set(["$queryRawUnsafe", "$executeRawUnsafe"]);

const SQL_SAFE_TERMINALS = new Set(["toDate", "toISOString"]);

const isWrapper = (context) =>
    (context.physicalFilename ?? context.filename)
        .replaceAll("\\", "/")
        .endsWith(WRAPPER_SUFFIX);

const isDayjsSource = (value) =>
    typeof value === "string" &&
    (value === "dayjs" || value.startsWith("dayjs/"));

const propertyName = (member) => {
    if (!member.computed) {
        return member.property.type === "Identifier"
            ? member.property.name
            : null;
    }

    return member.property.type === "Literal" &&
        typeof member.property.value === "string"
        ? member.property.value
        : null;
};

const GLOBAL_OBJECTS = new Set(["globalThis", "window", "global"]);

// A name resolves to the global unless some enclosing scope declares its own.
const isGlobalName = (sourceCode, node, identifier, name) => {
    if (identifier.type !== "Identifier" || identifier.name !== name) {
        return false;
    }

    for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
        const variable = scope.set.get(name);

        if (variable && variable.defs.length > 0) {
            return false;
        }
    }

    return true;
};

// The global `Date`, bare or read off the global object (`globalThis.Date`).
const isGlobalDate = (sourceCode, node, expression) => {
    if (expression.type === "Identifier") {
        return isGlobalName(sourceCode, node, expression, "Date");
    }

    return (
        expression.type === "MemberExpression" &&
        propertyName(expression) === "Date" &&
        expression.object.type === "Identifier" &&
        GLOBAL_OBJECTS.has(expression.object.name) &&
        isGlobalName(
            sourceCode,
            node,
            expression.object,
            expression.object.name
        )
    );
};

const isDayjsCall = (node) =>
    node.type === "CallExpression" &&
    ((node.callee.type === "Identifier" && node.callee.name === "dayjs") ||
        (node.callee.type === "MemberExpression" &&
            node.callee.object.type === "Identifier" &&
            node.callee.object.name === "dayjs"));

const containsDayjsCall = (node) => {
    if (!node || typeof node.type !== "string") {
        return false;
    }

    if (isDayjsCall(node)) {
        return true;
    }

    return Object.keys(node).some((key) => {
        if (key === "parent") {
            return false;
        }

        const value = node[key];

        if (Array.isArray(value)) {
            return value.some(containsDayjsCall);
        }

        return value && typeof value.type === "string"
            ? containsDayjsCall(value)
            : false;
    });
};

const endsInSqlSafeCall = (node) =>
    node.type === "CallExpression" &&
    node.callee.type === "MemberExpression" &&
    SQL_SAFE_TERMINALS.has(propertyName(node.callee));

const isRawSqlTag = (tag) => {
    if (tag.type === "Identifier") {
        return RAW_SQL_TAGS.has(tag.name);
    }

    return (
        tag.type === "MemberExpression" && RAW_SQL_TAGS.has(propertyName(tag))
    );
};

const isValueImport = (node) =>
    node.importKind !== "type" &&
    !(
        node.specifiers.length > 0 &&
        node.specifiers.every((specifier) => specifier.importKind === "type")
    );

export default {
    meta: {
        type: "suggestion",
        hasSuggestions: true,
        docs: {
            description:
                "Use dayjs for every date operation; native `Date` only as a type / transport value.",
        },
        messages: {
            newDateNow:
                "Use `dayjs()` instead of `new Date()` (end in `.toDate()` only at a Prisma / zod boundary).",
            newDateFrom:
                "Use `dayjs(x)` instead of `new Date(x)` — `dayjs.utc(s)` for a `YYYY-MM-DD` string, `dayjs.unix(s)` for seconds. `dayjs(undefined)` is now, so guard nullable input.",
            dateCall:
                "Use `dayjs().format()` / `dayjs().toISOString()` instead of calling `Date()` as a function.",
            dateNow:
                "Use `dayjs().valueOf()` instead of `Date.now()` (or `performance.now()` for elapsed time).",
            dateUtc: "Use `dayjs.utc(...)` instead of `Date.UTC(...)`.",
            dateParse: "Use `dayjs(s).valueOf()` instead of `Date.parse(s)`.",
            nativeMethod:
                "Native Date `.{{method}}()` — use {{replacement}} instead.",
            dayjsImport:
                "Import `dayjs` from `@/lib/dayjs/dayjs.util.js` — the wrapper registers the plugins. Only `import type` from `{{source}}` is allowed here.",
            rawSqlDayjs:
                "A Dayjs interpolated into raw SQL serializes wrongly and tsc cannot catch it (`Prisma.sql` accepts `unknown`); end it in `.toDate()`.",
            dateAlias:
                "Aliasing the global `Date` hides it from this rule — use dayjs.",
            suggestDayjs: "Replace with `dayjs()`.",
            suggestDayjsValueOf: "Replace with `dayjs().valueOf()`.",
        },
        schema: [],
    },

    create(context) {
        if (isWrapper(context)) {
            return {};
        }

        const sourceCode = context.sourceCode ?? context.getSourceCode();

        const reportImport = (node, source) =>
            context.report({
                node,
                messageId: "dayjsImport",
                data: { source },
            });

        const declaredInit = (identifier) => {
            const variable = sourceCode
                .getScope(identifier)
                .references.find(
                    (reference) => reference.identifier === identifier
                )?.resolved;

            const definition =
                variable?.defs.length === 1 ? variable.defs[0] : null;

            return definition?.type === "Variable"
                ? definition.node.init
                : null;
        };

        const isUnsafeSqlValue = (expression) => {
            const value =
                expression.type === "Identifier"
                    ? declaredInit(expression)
                    : expression;

            return Boolean(
                value && containsDayjsCall(value) && !endsInSqlSafeCall(value)
            );
        };

        const reportRawSqlValues = (expressions) => {
            for (const expression of expressions) {
                if (isUnsafeSqlValue(expression)) {
                    context.report({
                        node: expression,
                        messageId: "rawSqlDayjs",
                    });
                }
            }
        };

        return {
            VariableDeclarator(node) {
                if (node.init && isGlobalDate(sourceCode, node, node.init)) {
                    context.report({ node, messageId: "dateAlias" });
                }
            },

            NewExpression(node) {
                if (!isGlobalDate(sourceCode, node, node.callee)) {
                    return;
                }

                if (node.arguments.length > 0) {
                    context.report({ node, messageId: "newDateFrom" });

                    return;
                }

                context.report({
                    node,
                    messageId: "newDateNow",
                    suggest: [
                        {
                            messageId: "suggestDayjs",
                            fix: (fixer) => fixer.replaceText(node, "dayjs()"),
                        },
                    ],
                });
            },

            CallExpression(node) {
                const { callee } = node;

                if (isGlobalDate(sourceCode, node, callee)) {
                    context.report({ node, messageId: "dateCall" });

                    return;
                }

                if (
                    callee.type === "Identifier" &&
                    callee.name === "require" &&
                    node.arguments[0]?.type === "Literal" &&
                    isDayjsSource(node.arguments[0].value)
                ) {
                    reportImport(node, node.arguments[0].value);

                    return;
                }

                if (callee.type !== "MemberExpression") {
                    return;
                }

                const name = propertyName(callee);

                if (RAW_SQL_UNSAFE_CALLS.has(name)) {
                    reportRawSqlValues(node.arguments.slice(1));

                    return;
                }

                if (
                    name === "construct" &&
                    isGlobalName(sourceCode, node, callee.object, "Reflect") &&
                    node.arguments[0] &&
                    isGlobalDate(sourceCode, node, node.arguments[0])
                ) {
                    context.report({ node, messageId: "newDateFrom" });

                    return;
                }

                if (
                    Object.hasOwn(DATE_STATICS, name) &&
                    isGlobalDate(sourceCode, node, callee.object)
                ) {
                    const messageId = DATE_STATICS[name];

                    context.report({
                        node,
                        messageId,
                        suggest:
                            messageId === "dateNow"
                                ? [
                                      {
                                          messageId: "suggestDayjsValueOf",
                                          fix: (fixer) =>
                                              fixer.replaceText(
                                                  node,
                                                  "dayjs().valueOf()"
                                              ),
                                      },
                                  ]
                                : undefined,
                    });

                    return;
                }

                if (NATIVE_METHODS.has(name)) {
                    context.report({
                        node,
                        messageId: "nativeMethod",
                        data: {
                            method: name,
                            replacement: NATIVE_METHODS.get(name),
                        },
                    });
                }
            },

            ImportDeclaration(node) {
                if (isDayjsSource(node.source.value) && isValueImport(node)) {
                    reportImport(node, node.source.value);
                }
            },

            ImportExpression(node) {
                if (
                    node.source.type === "Literal" &&
                    isDayjsSource(node.source.value)
                ) {
                    reportImport(node, node.source.value);
                }
            },

            TaggedTemplateExpression(node) {
                if (!isRawSqlTag(node.tag)) {
                    return;
                }

                reportRawSqlValues(node.quasi.expressions);
            },
        };
    },
};
