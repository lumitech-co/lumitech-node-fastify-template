# CLAUDE.md - Project Guide for Claude Code

## Project Overview
Node.js Fastify backend template with TypeScript, featuring:
- **Fastify** - HTTP framework
- **Awilix** - Dependency Injection container
- **Prisma** - Database ORM (PostgreSQL)
- **Zod** - Schema validation
- **Swagger** - API documentation

## Critical: Code Generation Commands

### Finishing a feature
**ALWAYS run lint and typescript checks when finishing a feature**
```bash
npm run lint:fix && npm run tsc-check
```

### Creating a New Module
**Never create a module by hand — always run the generator first:**
```bash
npm run generate:module <moduleName>
```
This creates:
- `src/modules/<name>/` - `index.ts` plus the `route`, `handler`, `service` and `type` files
- `src/lib/validation/<name>/` - Validation schema file
- Updates `src/types/di-container.type.ts` with new types

### Creating a New Repository
**Never create a repository by hand — always run the generator first:**
```bash
npm run generate:repository <entityName>
```
This creates:
- `src/database/repositories/<name>/<name>.repository.ts` - the `<Name>Repository` type and the
  factory (with `findUniqueOrFail`) in a single file
- Updates `src/lib/messages/messages.constant.ts` with the entity's `notFound` message
- Updates `src/types/di-container.type.ts` with new type

## Architecture Rules (non-negotiable)

These rules are hard constraints. If a task cannot be done without breaking one of them,
stop and ask instead of working around it.

### 0. Modules and repositories are only ever created by the generators
A new module or a new repository is **always** scaffolded by the CLI, never by hand:
```bash
npm run generate:module <moduleName>       # node cli/module-gen/index.js
npm run generate:repository <entityName>   # node cli/repository-gen/index.js
```
Creating `src/modules/<name>/**` or `src/database/repositories/<name>/**` with the Write tool
is forbidden — the generators also wire `src/types/di-container.type.ts`,
`src/lib/validation/<name>/` and `RESPONSE_MESSAGES`, and hand-written files silently skip that
wiring. Run the generator first, then edit the files it produced.

If the generator cannot produce what the task needs, stop and ask — do not fall back to
creating the files manually. Fixing the generator is a valid answer; bypassing it is not.

### 1. Everything goes through Awilix
Every handler, service, repository and lib that has dependencies is a factory function
registered in the container via `addDIResolverName()` and typed in
`src/types/di-container.type.ts`. No manual `new`/`import`-and-call of another layer,
no singletons created outside the container.

Route registrars (`create<Name>Routes`) are **not** container entries: the module's
`index.ts` resolves the handler from the container and passes it to the registrar:
```typescript
export default async function (fastify: FastifyInstance) {
    const messageHandler = fastify.di.resolve("messageHandler");
    createMessageRoutes(fastify, messageHandler);
}
```

### 2. Database access only through repositories
- All Prisma calls and all SQL (`$queryRaw` / `$executeRaw`) live **only** in
  `src/database/repositories/**`. Services, handlers, routes, plugins and utils must
  never touch `prisma.*` directly.
- `src/plugins/prisma.ts` is outside this rule: it owns the client lifecycle
  (`new PrismaClient()`, `$connect`, `$disconnect`) and decorates Fastify with it.
  No other plugin may query the database.
- **The only exception:** transactions. A service may inject `prisma` solely to open
  `prisma.$transaction(...)` and pass the transaction client down to repository methods.
  Business queries inside the transaction still go through repositories.

### 3. No database calls in loops
Never call a repository inside `for` / `while` / `map` / `forEach`. Use bulk operations
(`createMany`, `updateMany`, `deleteMany`, `findMany` with `where: { id: { in: [...] } }`)
or a single transaction. If a loop looks unavoidable, redesign the query.

### 4. Function signatures
The rule applies to exactly two kinds of functions:
- **service methods** (the functions on a `<Name>Service` object);
- **utility functions we write ourselves** (`<name>.util.ts`, helpers in `src/lib/**`).

Each of them must:
- take **at most one argument** — a primitive or a single object
  (`({ a, b }) => ...`; zero arguments when there is no input);
- **always return a value.** No `void` helpers, no side-effect-only functions.

```typescript
// service method
createMessage: async ({ payload }: CreateMessagePayload) => { ... };

// utility
export const diffObjects = ({ oldObj, newObj }: DiffObjectsPayload) => { ... };
```

**Everything else keeps its natural signature — do not touch it:**
- Awilix factories (`createService`, `createHandler`, `create<Name>Repository`) take as
  many parameters as they have dependencies — that is how Awilix injects by name;
- `addDIResolverName(fn, "name")` and the rest of the Awilix wiring;
- Fastify route handlers `(request, reply)`, plugins `(fastify)`, route registrars
  `(fastify, handler)` and the infrastructure helper `generateRepository(prisma, model)`.

### 5. Constants and types placement
- Module constants → `src/modules/<name>/<name>.constant.ts`
- Module types → `src/modules/<name>/<name>.type.ts`
- **Exception:** the `<Name>Service` and `<Name>Handler` types stay in the same file as
  their factory (`<name>.service.ts` / `<name>.handler.ts`), together with their payload
  types. Everything else the module needs (util payloads, internal shapes) goes to
  `<name>.type.ts`.
- Repository types → the same file as the repository factory
  (`src/database/repositories/<name>/<name>.repository.ts`); a repository never gets its own
  `<name>.type.ts` (`BaseRepository` itself lives in
  `src/database/repositories/repository.type.ts`)
- Lib types → `src/lib/<name>/<name>.type.ts`
- Global constants → `src/lib/constants/`
- Global types → `src/types/`
- A constant may live outside a `*.constant.ts` file only in the three cases below:
  routing constants (see next paragraph), client-facing messages (rule 5a), and a constant
  used by a Zod schema (e.g. a min/max length or an enum inside
  `src/lib/validation/<module>/<module>.schema.ts`), which stays next to that schema.

**Routing constants stay with the routes.** The module tag and the route-path enum are
declared (not exported) at the top of `<name>.route.ts`, and the endpoint prefix stays
inline in `index.ts` as the `autoPrefix` literal. Never move them into a `*.constant.ts`:
```typescript
// src/modules/message/index.ts
export const autoPrefix = "/api/messages";

// src/modules/message/message.route.ts
const MESSAGE_TAG = "message";

enum MessageRoute {
    Root = "/",
}
```

A module gets a `<name>.constant.ts` only when it has constants that are neither routing
nor messages — otherwise the file does not exist.

### 5a. Response and error messages
Every message a **module** returns to the client — success messages and error messages
alike — lives in the single `RESPONSE_MESSAGES` object in
`src/lib/messages/messages.constant.ts`, grouped by module. Never inline such a string,
and never keep it in a module's `*.constant.ts`:
```typescript
// src/lib/messages/messages.constant.ts
export const RESPONSE_MESSAGES = {
    message: {
        created: "Message created successfully.",
        notFound: "Message not found.",
    },
} as const;

// usage
throw new NotFoundError(RESPONSE_MESSAGES.message.notFound);
```

Two things do **not** belong in `RESPONSE_MESSAGES`, because it is grouped by module and
holds messages, not payloads:
- **response payload values** — e.g. the `"pong"` body of the health check lives in
  `src/modules/application/application.constant.ts`;
- **plugin/infrastructure strings** — e.g. the Swagger basic-auth error lives in
  `src/lib/constants/swagger.constant.ts`.

### 6. Third-party libraries reach the container only through plugins
If a third-party library must be available through Awilix — i.e. something injected into a
handler, service or repository (cache, queue, storage, mailer, db client, …) — it is wired
as a Fastify plugin in `src/plugins/`, registered with `fastify-plugin`, exposed to the
container in `src/plugins/awilix.ts` with `asValue`, and typed in `Cradle`. Never import a
client/SDK directly inside a handler, service or repository, and never register a
container entry from anywhere but `src/plugins/`.

A dependency-free wrapper in `src/lib/**` (e.g. `src/lib/hashing/hashing.ts` over `argon2`)
is not a container entry: it holds no state, needs no configuration and is imported
directly. The moment such a wrapper needs configuration or lifecycle, it becomes a plugin.

A plugin needs a name in `FastifyPlugin` (`src/lib/constants/fastify.constant.ts`) when it
is referenced by another plugin's `dependencies`, or when it is a foundational plugin other
code is expected to depend on (`prisma`, `env`, `jwt`, `awilix`). Plugins that nothing
depends on — `cors`, `error`, `zod` — stay anonymous: `fp(configure, {})`. `swagger` is
anonymous too, but still passes options (`dependencies: [FastifyPlugin.Env]` and
`encapsulate: false`, so it can see the routes it documents).

### 7. Validation only via Zod
All application data — body, params, query, headers, external API responses — is validated
with Zod schemas in `src/lib/validation/<module>/<module>.schema.ts`. No manual
`if (!x) throw`, no ad-hoc type casts as a substitute for validation. Types are derived
with `z.infer`, never hand-written in parallel to a schema.

**Exceptions:**
- Environment variables are validated by `@fastify/env` with `fluent-json-schema` in
  `src/plugins/env.ts` — that is framework configuration, not application data.
  `EnvConfig` (`src/types/env.type.ts`) must be kept in sync with it by hand.
- `src/server.ts` reads `process.env.NODE_ENV` with a type cast to pick the logger
  config. This runs before the env plugin is loaded, so `fastify.config` does not exist
  yet — the cast is correct there and must not be "fixed" into a Zod parse.

### 8. Typed JSON in Prisma
Every `Json` column must be typed at the Prisma level (typed JSON via
`/// [TypeName]` + `prisma-json-types-generator`), so it arrives in the code already
typed. Casting `Prisma.JsonValue` to a type inside a service is forbidden.

The schema currently has no `Json` column, so `prisma-json-types-generator` is not
installed yet — add it together with the first `Json` field.

### 9. Migrations are only created by `prisma:migrate:create`
The only way to produce a migration is to edit `src/database/prisma/schema.prisma` and run:
```bash
npm run prisma:migrate:create   # prisma migrate dev --create-only
npm run prisma:migrate:apply    # prisma migrate dev — applies it
```
`--create-only` writes the SQL but does not run it, so the generated migration is reviewed
before it touches the database.

Forbidden:
- writing or editing a file under `src/database/prisma/migrations/**` by hand, or creating the
  migration folder yourself — the SQL is generated from the schema, never authored;
- `prisma migrate dev` without `--create-only` as the *first* step (it creates and applies in
  one go, leaving no review point);
- `npm run prisma:push` (`prisma db push`) to change a schema that has migrations — it mutates
  the database without recording a migration and desyncs the migration history.

Editing a migration that Prisma has already generated is allowed only when the schema alone
cannot express the change (a data backfill, a custom index). If a generated migration would be
destructive, stop and ask instead of hand-editing it.

## Architecture

### Layered Architecture
```
Routes → Handlers → Services → Repositories → Database
```

### Module Structure
Each module in `src/modules/<name>/` contains:
```
├── index.ts             # Entry point: autoPrefix literal + route registration (always present)
├── <name>.route.ts      # Tag, route-path enum and route definitions with Zod schemas
├── <name>.handler.ts    # <Name>Handler type + request handlers (thin layer)
├── <name>.service.ts    # <Name>Service type + business logic
├── <name>.type.ts       # Module types other than the service/handler types (optional)
├── <name>.constant.ts   # Non-routing, non-message constants only (optional)
├── <name>.util.ts       # Module utilities (optional)
└── README.md            # What the module does and its endpoints (optional)
```
`index.ts` is a Fastify plugin entry point (autoload + `autoPrefix`), not a barrel file —
it is required in every module.

The module's factories are named `createService`, `createHandler` and `create<Name>Routes`
in every module — the DI name passed to `addDIResolverName()` is what makes them unique,
not the function name. See `src/modules/message/` as the reference module.

### Dependency Injection Pattern
Uses factory functions (not classes) with Awilix:

```typescript
// Service example
export const createService = (
    messageRepository: MessageRepository,  // Injected by name match
    log: FastifyBaseLogger,
    config: EnvConfig
): MessageService => ({
    // implementation
});

addDIResolverName(createService, "messageService");  // Register with DI
```

Dependencies are injected based on parameter names matching registered names in the container.

### DI Container Type
All dependencies must be declared in `src/types/di-container.type.ts`:
```typescript
export type Cradle = {
    log: FastifyBaseLogger;
    prisma: PrismaClient;
    config: EnvConfig;
    // ... services, handlers, repositories
};
```

## Directory Structure

```
src/
├── database/
│   ├── dbml/            # Generated ER diagram (npm run prisma:diagram) - never edit by hand
│   ├── prisma/          # Schema, migrations and Prisma helper types
│   └── repositories/    # Data access layer (all Prisma calls live here)
├── lib/
│   ├── awilix/          # DI helpers
│   ├── constants/       # Global constants
│   ├── errors/          # Error classes
│   ├── hashing/         # Password hashing
│   ├── messages/        # RESPONSE_MESSAGES - all client-facing messages
│   └── validation/      # Zod schemas by module
├── modules/             # Feature modules
├── plugins/             # Fastify plugins
└── types/               # Global TypeScript definitions
```

## Key Patterns

### Validation Schemas
Define in `src/lib/validation/<module>/<module>.schema.ts`:
```typescript
const createMessageBodySchema = z.object({
    text: z.string(),
});
type CreateMessageInput = z.infer<typeof createMessageBodySchema>;
```

### Error Handling
Use predefined errors from `src/lib/errors/errors.ts` with a message from `RESPONSE_MESSAGES`.
They are error classes — always instantiate them with `new`:
```typescript
import { NotFoundError } from "@/lib/errors/errors.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";

throw new NotFoundError(RESPONSE_MESSAGES.message.notFound);
```

### Repository Pattern
The repository type and its factory live in the same `<name>.repository.ts` file. Every
repository exposes `findUniqueOrFail`, which throws `NotFoundError` with the entity's message
from `RESPONSE_MESSAGES`:
```typescript
// src/database/repositories/message/message.repository.ts
export type MessageRepository = BaseRepository<"message"> & {
    findUniqueOrFail: FindUniqueOrFail<
        Prisma.MessageFindUniqueArgs,
        Prisma.$MessagePayload
    >;
};

export const createMessageRepository = (
    prisma: PrismaClient
): MessageRepository => {
    const repository = generateRepository(prisma, "Message");

    return {
        ...repository,
        findUniqueOrFail: async (args) => {
            const message = await prisma.message.findUnique(args);

            if (!message) {
                throw new NotFoundError(RESPONSE_MESSAGES.message.notFound);
            }

            return message;
        },
    };
};

addDIResolverName(createMessageRepository, "messageRepository");
```

### Route Registration
Routes use Zod schemas for validation and OpenAPI docs; the tag and the path enum are
declared in the same `*.route.ts` file:
```typescript
const MESSAGE_TAG = "message";

enum MessageRoute {
    Root = "/",
}

fastify.post(MessageRoute.Root, {
    schema: {
        tags: [MESSAGE_TAG],
        summary: "Create message",
        body: createMessageBodySchema,
        response: { 200: createMessageResponseSchema },
    },
}, messageHandler.createMessage);
```

### Plugin Dependencies
Plugins declare dependencies via fastify-plugin:
```typescript
export default fp(configurePlugin, {
    name: FastifyPlugin.PluginName,
    dependencies: [FastifyPlugin.Env, FastifyPlugin.Prisma],
});
```

## Common Tasks

### Add a new feature module
1. Run `npm run generate:module featureName`
2. Define Prisma model in `src/database/prisma/schema.prisma`
3. Run `npm run generate:repository featureName`
4. Implement service logic
5. Define routes with Zod schemas

### Add database model
1. Edit `src/database/prisma/schema.prisma`
2. Run `npm run prisma:migrate:create`
3. Run `npm run prisma:migrate:apply`
4. Run `npm run generate:repository modelName`

### Run tests
- Unit: `npm run test:unit`
- Integration: `docker compose -f docker-compose.test.yml up` then `npm run test:int`

## Important Conventions
- New modules and repositories are scaffolded only with `npm run generate:module` /
  `npm run generate:repository` — never written by hand (see Architecture Rules #0)
- Migrations are created only with `npm run prisma:migrate:create` and never hand-written
  (see Architecture Rules #9)
- Use factory functions, not classes
- Register all DI dependencies with `addDIResolverName()`
- Keep handlers thin - delegate to services
- Validate inputs with Zod schemas
- Service methods and our own utils: at most one argument, always return a value
  (see Architecture Rules #4). Awilix factories, Fastify handlers/plugins/route registrars
  keep their natural signatures — do not rewrite them
- Prisma only inside repositories; `$transaction` is the single exception (see Architecture Rules #2)
- Never query the database inside a loop (see Architecture Rules #3)
- Client-facing messages come from `RESPONSE_MESSAGES` (see Architecture Rules #5a)
- Route tag, route paths and `autoPrefix` stay with the routes, not in `*.constant.ts`
  (see Architecture Rules #5)
- Use `@/` path alias for imports from src
- **No inline comments** - Do not add comments after lines of code. JSDoc comments for functions/methods are allowed when they add meaningful context (e.g., security considerations, non-obvious behavior)
- **No barrel files** - Do not create `index.ts` files that re-export from other files. Import directly from the source file instead (a module's `index.ts` is a Fastify plugin entry point, not a barrel)
