# CLAUDE.md - Project Guide for Claude Code

## Project Overview
Node.js Fastify backend template with TypeScript, featuring:
- **Fastify** - HTTP framework
- **Awilix** - Dependency Injection container
- **Prisma** - Database ORM (PostgreSQL)
- **Zod** - Schema validation
- **Swagger** - API documentation

## Critical: Code Generation Commands

### Creating a New Module
**ALWAYS run lint and typescript checks when finishing a feature**
```bash
npm run lint:fix && npm run typescript
```

### Creating a New Module
**ALWAYS use the CLI generator instead of manually creating files:**
```bash
npm run generate:module <moduleName>
```
This creates:
- `src/modules/<name>/` - Module directory with route, handler, service, index files
- `src/lib/validation/<name>/` - Validation schema file
- Updates `src/types/di-container.type.ts` with new types

### Creating a New Repository
**ALWAYS use the CLI generator instead of manually creating files:**
```bash
npm run generate:repository <entityName>
```
This creates:
- `src/database/repositories/<name>/` - Repository file extending BaseRepository
- Updates `src/types/di-container.type.ts` with new type

## Architecture

### Layered Architecture
```
Routes → Handlers → Services → Repositories → Database
```

### Module Structure
Each module in `src/modules/<name>/` contains:
```
├── index.ts           # Entry point with autoPrefix export
├── <name>.route.ts    # Route definitions with Zod schemas
├── <name>.handler.ts  # Request handlers (thin layer)
└── <name>.service.ts  # Business logic
```

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
│   ├── prisma/           # Schema and migrations
│   └── repositories/     # Data access layer
├── lib/
│   ├── awilix/          # DI helpers
│   ├── errors/          # Error factories
│   └── validation/      # Zod schemas by module
├── modules/             # Feature modules
├── plugins/             # Fastify plugins
└── types/               # TypeScript definitions
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
Use predefined errors from `src/lib/errors/errors.ts`:
```typescript
import { NotFoundError, BadRequestError } from "@/lib/errors/errors.js";
throw NotFoundError("Message not found");
```

### Repository Pattern
Extend BaseRepository with custom methods:
```typescript
export type MessageRepository = BaseRepository<"message"> & {
    findUniqueOrFail: (...) => Promise<...>;
};
```

### Route Registration
Routes use Zod schemas for validation and OpenAPI docs:
```typescript
fastify.post("/", {
    schema: {
        tags: ["message"],
        summary: "Create message",
        body: createMessageBodySchema,
        response: { 200: createMessageResponseSchema },
    },
}, handler.createMessage);
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
- Use factory functions, not classes
- Register all DI dependencies with `addDIResolverName()`
- Keep handlers thin - delegate to services
- Validate inputs with Zod schemas
- Use `@/` path alias for imports from src
- **No inline comments** - Do not add comments after lines of code. JSDoc comments for functions/methods are allowed when they add meaningful context (e.g., security considerations, non-obvious behavior)
- **No barrel files** - Do not create `index.ts` files that re-export from other files. Import directly from the source file instead
- **Paginate all lists** - Every endpoint that returns a list must include pagination (cursor-based or offset/skip-based)
