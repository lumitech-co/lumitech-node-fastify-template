# CLAUDE.md — Project rules for Claude Code

Node.js **Fastify** backend template: TypeScript, **Awilix** DI, **Prisma** (PostgreSQL),
**Zod** validation, **Swagger** docs.

**This file is the rulebook — strict, non-negotiable constraints.** For how the project is
built (layered design, patterns, code examples, directory layout, common tasks), read
[ARCHITECTURE.md](./ARCHITECTURE.md). For setup/run/tooling, read [README.md](./README.md).
Consult those on demand; do not duplicate their content here.

## Commands

```bash
# Scaffolding (never create these files by hand — see Rule 0)
npm run generate:module <moduleName>       # new module
npm run generate:repository <entityName>   # new repository

# Migrations (never hand-write SQL — see Rule 9)
npm run prisma:migrate:create              # create SQL migration (review before applying)
npm run prisma:migrate:apply               # apply it

# Finishing a feature — ALWAYS run both
npm run lint:fix && npm run tsc-check
```

## Architecture Rules (non-negotiable)

These are hard constraints. If a task cannot be done without breaking one, **stop and ask**
instead of working around it. Code examples for each live in
[ARCHITECTURE.md](./ARCHITECTURE.md).

### 0. Modules and repositories are created only by the generators
Never create `src/modules/<name>/**` or `src/database/repositories/<name>/**` by hand — the
generators also wire `src/types/di-container.type.ts`, `src/lib/validation/<name>/` and
`RESPONSE_MESSAGES`, and hand-written files silently skip that wiring. Run the generator
first, then edit the files it produced. If the generator cannot produce what the task needs,
stop and ask — fixing the generator is a valid answer; bypassing it is not.

### 1. Everything goes through Awilix
Every handler, service, repository and lib with dependencies is a factory function
registered via `addDIResolverName()` and typed in `src/types/di-container.type.ts`. No
manual `new`/import-and-call of another layer, no singletons outside the container. Route
registrars (`create<Name>Routes`) are **not** container entries — `index.ts` resolves the
handler from the container and passes it to the registrar.

### 2. Database access only through repositories
- All Prisma calls and all SQL (`$queryRaw` / `$executeRaw`) live **only** in
  `src/database/repositories/**`. Services, handlers, routes, plugins and utils never touch
  `prisma.*` directly.
- `src/plugins/prisma.ts` is the exception for lifecycle only (`new PrismaClient()`,
  `$connect`, `$disconnect`, decorate Fastify). No other plugin may query the database.
- **The only business-logic exception:** transactions. A service may inject `prisma` solely
  to open `prisma.$transaction(...)` and pass the transaction client down to repository
  methods. Queries inside the transaction still go through repositories.

### 3. No database calls in loops
Never call a repository inside `for` / `while` / `map` / `forEach`. Use bulk operations
(`createMany`, `updateMany`, `deleteMany`, `findMany` with `where: { id: { in: [...] } }`)
or a single transaction. If a loop looks unavoidable, redesign the query.

### 4. Function signatures
Applies to exactly two kinds of functions — **service methods** (functions on a
`<Name>Service`) and **utility functions we write** (`<name>.util.ts`, helpers in
`src/lib/**`). Each must:
- take **at most one argument** — a primitive or a single object (zero when there is no input);
- **always return a value** — no `void` / side-effect-only helpers.

Everything else keeps its natural signature — do not touch it: Awilix factories
(`createService`, `createHandler`, `create<Name>Repository`) take one param per dependency;
`addDIResolverName(fn, "name")`; Fastify handlers `(request, reply)`, plugins `(fastify)`,
route registrars `(fastify, handler)`, and `generateRepository(prisma, model)`.

### 5. Constants and types placement
- Module constants → `src/modules/<name>/<name>.constant.ts`
- Module types → `src/modules/<name>/<name>.type.ts`
- **Exception:** the `<Name>Service` / `<Name>Handler` types stay in the same file as their
  factory (`<name>.service.ts` / `<name>.handler.ts`), with their payload types. Everything
  else the module needs goes to `<name>.type.ts`.
- Repository types → the same file as the repository factory; a repository never gets its
  own `<name>.type.ts` (`BaseRepository` lives in `repositories/repository.type.ts`).
- Lib types → `src/lib/<name>/<name>.type.ts`; global constants → `src/lib/constants/`;
  global types → `src/types/`.

A constant may live outside a `*.constant.ts` file only in three cases: routing constants
(below), client-facing messages (Rule 5a), and a constant used by a Zod schema (min/max,
enum) which stays next to that schema.

**Routing constants stay with the routes.** The module tag and the route-path enum are
declared (not exported) at the top of `<name>.route.ts`; the endpoint prefix stays inline in
`index.ts` as the `autoPrefix` literal. Never move them into a `*.constant.ts`. A module gets
a `<name>.constant.ts` only for constants that are neither routing nor messages.

### 5a. Response and error messages
Every message a **module** returns to the client — success and error alike — lives in the
single `RESPONSE_MESSAGES` object in `src/lib/messages/messages.constant.ts`, grouped by
module. Never inline such a string, never keep it in a module's `*.constant.ts`. Two things
do **not** belong there: **response payload values** (e.g. the health check's `"pong"` →
`application.constant.ts`) and **plugin/infrastructure strings** (e.g. the Swagger
basic-auth error → `src/lib/constants/swagger.constant.ts`).

### 6. Third-party libraries reach the container only through plugins
If a third-party library must be injected into a handler, service or repository (cache,
queue, storage, mailer, db client, …), it is wired as a Fastify plugin in `src/plugins/`,
registered with `fastify-plugin`, exposed to the container in `src/plugins/awilix.ts` with
`asValue`, and typed in `Cradle`. Never import a client/SDK directly inside a handler,
service or repository; never register a container entry from anywhere but `src/plugins/`.

A dependency-free wrapper in `src/lib/**` (e.g. `src/lib/hashing/hashing.ts` over `argon2`)
is not a container entry — it holds no state and is imported directly. The moment it needs
configuration or lifecycle, it becomes a plugin. A plugin needs a name in `FastifyPlugin`
(`src/lib/constants/fastify.constant.ts`) only when another plugin's `dependencies`
references it, or when it is foundational (`prisma`, `env`, `jwt`, `awilix`); plugins nothing
depends on (`cors`, `error`, `zod`) stay anonymous.

### 7. Validation only via Zod
All application data — body, params, query, headers, external API responses — is validated
with Zod schemas in `src/lib/validation/<module>/<module>.schema.ts`. No manual
`if (!x) throw`, no ad-hoc casts as a substitute for validation. Types are derived with
`z.infer`, never hand-written in parallel. This includes the contents of a Prisma `Json`
column (see Rule 8).

**Exceptions:** environment variables are validated by `@fastify/env` with
`fluent-json-schema` in `src/plugins/env.ts` (keep `EnvConfig` in sync by hand); and
`src/server.ts` reads `process.env.NODE_ENV` with a cast to pick the logger config, because
it runs before the env plugin loads.

### 8. Typed JSON in Prisma
A `Json` column is never left untyped. Adding one always means doing **both** — a `Json`
field with only one is incomplete:
- **a) Type it** with `prisma-json-types-generator` (`/// [TypeName]` + a type in the
  `PrismaJson` namespace in `src/types/prisma-json.d.ts`), then `npm run prisma:generate`.
  Casting `Prisma.JsonValue` to a type inside a service/handler/repository is forbidden.
- **b) Validate it** with a Zod schema in `src/lib/validation/<module>/<module>.schema.ts`,
  used in the route schema and mirrored in the response schema when returned.

Keep the Zod schema and the `PrismaJson` type in sync. Never write a `Json` value that has
not been through a Zod parse. Pin the generator to the major matching Prisma (Prisma 6 →
`prisma-json-types-generator@^3`).

### 9. Migrations are created only by `prisma:migrate:create`
Edit `src/database/prisma/schema.prisma`, then `npm run prisma:migrate:create`
(`--create-only` writes the SQL without running it, so it is reviewed) and
`npm run prisma:migrate:apply`. Forbidden: writing/editing any file under
`src/database/prisma/migrations/**` by hand or creating the folder yourself; running
`prisma migrate dev` without `--create-only` as the first step; using
`npm run prisma:push` to change a schema that has migrations. Editing an already-generated
migration is allowed only when the schema alone cannot express the change (a data backfill,
a custom index); if a generated migration would be destructive, stop and ask.

## Conventions
- Scaffold modules/repositories only with the generators (Rule 0); create migrations only
  with `prisma:migrate:create` (Rule 9).
- Use factory functions, not classes; register all DI with `addDIResolverName()`.
- Keep handlers thin — delegate to services. Validate inputs with Zod.
- Prisma only inside repositories; `$transaction` is the single exception (Rule 2). Never
  query the database in a loop (Rule 3).
- Client-facing messages come from `RESPONSE_MESSAGES` (Rule 5a).
- Route tag, route paths and `autoPrefix` stay with the routes, not in `*.constant.ts` (Rule 5).
- A Prisma `Json` column is always both typed and Zod-validated (Rule 8).
- Service methods and our own utils: at most one argument, always return a value (Rule 4).
- Use the `@/` path alias for imports from `src`.
- **No inline comments** after lines of code. JSDoc on functions is allowed when it adds
  meaningful context (security notes, non-obvious behavior).
- **No barrel files** — import directly from the source file (a module's `index.ts` is a
  Fastify plugin entry point, not a barrel).
