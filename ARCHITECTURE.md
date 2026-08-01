# ARCHITECTURE.md — How this project is built

Reference companion to [CLAUDE.md](./CLAUDE.md). CLAUDE.md holds the non-negotiable
rules; this file holds the "how" — the layered design, the patterns, and the code
examples the rules point to. Read the relevant section here when a rule references it.

## Stack
- **Fastify** — HTTP framework
- **Awilix** — Dependency Injection container
- **Prisma** — Database ORM (PostgreSQL)
- **Zod** — Schema validation
- **Swagger** — API documentation

## Layered Architecture
```
Routes → Handlers → Services → Repositories → Database
```
- **Routes** — endpoint paths + Zod schemas + Swagger docs.
- **Handlers** — thin request/response layer; delegate to services.
- **Services** — business logic; coordinate repositories and libs.
- **Repositories** — the only place Prisma/SQL runs.

## Module Structure
Each module in `src/modules/<name>/`:
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
`index.ts` is a Fastify plugin entry point (autoload + `autoPrefix`), **not** a barrel file —
it is required in every module.

The module's factories are named `createService`, `createHandler` and `create<Name>Routes`
in every module — the DI name passed to `addDIResolverName()` is what makes them unique,
not the function name. See `src/modules/message/` as the reference module.

`index.ts` resolves the handler from the container and passes it to the registrar (the
registrar is not a container entry):
```typescript
// src/modules/message/index.ts
export const autoPrefix = "/api/messages";

export default async function (fastify: FastifyInstance) {
    const messageHandler = fastify.di.resolve("messageHandler");
    createMessageRoutes(fastify, messageHandler);
}
```

## Dependency Injection Pattern
Factory functions (not classes) wired by Awilix. Dependencies are injected by parameter
name matching a registered name in the container.
```typescript
export const createService = (
    messageRepository: MessageRepository,  // Injected by name match
    log: FastifyBaseLogger,
    config: EnvConfig
): MessageService => ({
    // implementation
});

addDIResolverName(createService, "messageService");  // Register with DI
```

### DI Container Type
All dependencies are declared in `src/types/di-container.type.ts`:
```typescript
export type Cradle = {
    log: FastifyBaseLogger;
    prisma: PrismaClient;
    config: EnvConfig;
    // ... services, handlers, repositories
};
```

## Key Patterns

### Validation Schemas
`src/lib/validation/<module>/<module>.schema.ts`:
```typescript
const createMessageBodySchema = z.object({
    text: z.string(),
});
type CreateMessageInput = z.infer<typeof createMessageBodySchema>;
```

### Error Handling
Error classes from `src/lib/errors/errors.ts` with a message from `RESPONSE_MESSAGES`.
Always instantiate with `new`:
```typescript
import { NotFoundError } from "@/lib/errors/errors.js";
import { RESPONSE_MESSAGES } from "@/lib/messages/messages.constant.js";

throw new NotFoundError(RESPONSE_MESSAGES.message.notFound);
```

### Repository Pattern
The repository type and its factory live in the same `<name>.repository.ts` file. Every
repository exposes `findUniqueOrFail`, which throws `NotFoundError` with the entity's
message from `RESPONSE_MESSAGES`:
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
declared (not exported) in the same `*.route.ts` file:
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

### Response Messages
Every client-facing message lives in the single `RESPONSE_MESSAGES` object in
`src/lib/messages/messages.constant.ts`, grouped by module:
```typescript
export const RESPONSE_MESSAGES = {
    message: {
        created: "Message created successfully.",
        notFound: "Message not found.",
    },
} as const;

throw new NotFoundError(RESPONSE_MESSAGES.message.notFound);
```

### Response Caching
Any route caches its response by declaring a `cache` config — no handler or service
change is needed. The `cache` plugin looks the entry up in `preHandler` and stores the
serialized body in `onSend`:
```typescript
fastify.get(
    MessageRoute.Root,
    {
        config: {
            cache: {
                ttl: MESSAGE_CACHE_TTL_SECONDS,
                namespace: MESSAGE_CACHE_NAMESPACE,
            },
        },
        schema: { ... },
    },
    messageHandler.getMessages
);
```
Every field is optional — `config: { cache: {} }` caches with the default TTL under a
namespace derived from the route method and path. The rest of the options tune the key:
- `ttl` — per-route lifetime in seconds (`CACHE_DEFAULT_TTL_SECONDS` otherwise);
- `namespace` — the group `cacheService.invalidate()` drops at once;
- `varyByHeaders` — headers the response depends on (`accept-language`, …);
- `varyBy` — any request-derived discriminator, e.g. `(request) => request.user.id`;
- `enabled` — skips the cache for a request when it returns `false`.

The key is `cache:<namespace>:<hash>` where the hash covers path, sorted query string,
vary headers and the `varyBy` value — so `?a=1&b=2` and `?b=2&a=1` are one entry.
Responses answer with an `x-cache: HIT | MISS` header. Only `GET`/`HEAD` and only `200`
responses are stored.

Writes drop the namespace they invalidate, from the service that owns them:
```typescript
await cacheService.invalidate({ namespace: MESSAGE_CACHE_NAMESPACE });
```
`cacheService` is also usable directly for anything narrower than a whole response —
`get` / `set` / `remove` / `invalidate`, plus `wrap` for read-through around an
expensive call. It is **fail-open by design**: a Redis outage or timeout is logged and
reported as a miss, never as a failed request.

### Rate Limiting
`@fastify/rate-limit` is registered globally in `src/plugins/rateLimit.ts` using the same
Redis client as caching (`fastify.redis`), so limits are shared across instances. Every
route gets `RATE_LIMIT_DEFAULT_MAX` requests per `RATE_LIMIT_DEFAULT_TIME_WINDOW` unless it
overrides or disables this via `config.rateLimit`:
```typescript
fastify.get(
    MessageRoute.Root,
    {
        config: {
            rateLimit: {
                max: MESSAGE_RATE_LIMIT_MAX,
                timeWindow: MESSAGE_RATE_LIMIT_TIME_WINDOW,
            },
        },
        schema: { ... },
    },
    messageHandler.getMessages
);
```
Set `config: { rateLimit: false }` to exempt a route entirely — used on `GET /ping` so
health checks from the load balancer never trip the limit. Clients are identified by
`request.ip`; `trustProxy: true` is set on the Fastify instance in `src/server.ts` so this
resolves the real client IP behind a proxy/load balancer instead of the proxy's own IP.
Exceeding the limit returns `429` with a body shaped like the rest of the app's errors
(`statusCode` / `error` / `message`). Like the cache plugin, it is **fail-open**
(`skipOnError: true`) — a Redis outage disables rate limiting rather than failing requests.

### Typed JSON in Prisma
A `Json` column is both typed and validated. Type it with `prisma-json-types-generator`:
```prisma
model Message {
  /// [MessageMeta]
  meta Json?
}
```
The referenced type is declared in the global `PrismaJson` namespace in
`src/types/prisma-json.d.ts`. After editing the schema run `npm run prisma:generate` — the
field then comes back as `PrismaJson.MessageMeta | null`, not `Prisma.JsonValue`.

Then validate it with Zod and keep the two in sync:
```typescript
// src/lib/validation/message/message.schema.ts
const messageMetaSchema = z.object({
    source: z.enum(["web", "mobile", "api"]),
    tags: z.array(z.string()).optional(),
});

const createMessageBodySchema = z.object({
    text: z.string(),
    meta: messageMetaSchema.optional(),
});
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

## Common Tasks

### Add a new feature module
1. Run `npm run generate:module featureName`
2. Define Prisma model in `src/database/prisma/schema.prisma`
3. Run `npm run generate:repository featureName`
4. Implement service logic
5. Define routes with Zod schemas

### Add a database model
1. Edit `src/database/prisma/schema.prisma`
2. Run `npm run prisma:migrate:create`
3. Run `npm run prisma:migrate:apply`
4. Run `npm run generate:repository modelName`

### Run tests
- Unit: `npm run test:unit`
- Integration: `docker compose -f docker-compose.test.yml up` then `npm run test:int`
