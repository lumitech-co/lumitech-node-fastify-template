# Message Module

API module for managing messages in the system.

## Base Path

```
/api/messages
```

## Endpoints

| Method | Path              | Description          | Auth |
|--------|-------------------|----------------------|------|
| POST   | /api/messages/    | Create a new message | No   |
| GET    | /api/messages/    | Fetch messages (cursor paginated) | No   |

---

## POST /api/messages/

Creates a new message.

### Request

**Body** (application/json):

```typescript
type CreateMessageInput = {
    text: string;
};
```

**Example:**

```json
{
    "text": "Hello, world!"
}
```

### Response

**Status:** 200 OK

```typescript
type CreateMessageResponse = {
    message: string;
    data: {
        message: {
            id: number;
            text: string;
            createdAt: Date;
        };
    };
};
```

**Example:**

```json
{
    "message": "Message created successfully.",
    "data": {
        "message": {
            "id": 1,
            "text": "Hello, world!",
            "createdAt": "2024-01-15T10:30:00.000Z"
        }
    }
}
```

### Errors

| Status | Error              | Description                    |
|--------|--------------------|--------------------------------|
| 400    | Bad Request        | Invalid or missing `text` field |

---

## GET /api/messages/

Fetches messages newest-first using **cursor pagination** keyed on the message `id`.

### Request

Query parameters (all optional):

| Param    | Type   | Default | Description                                                        |
|----------|--------|---------|--------------------------------------------------------------------|
| `limit`  | number | `20`    | Page size, between `1` and `100`.                                  |
| `cursor` | number | —       | Return messages with `id` **less than** this value (the previous page's `nextCursor`). Omit for the first page. |

Messages are ordered by `id` descending, so the cursor walks from newest to oldest.

### Response

**Status:** 200 OK

`nextCursor` is the `id` to pass as `cursor` for the next page, or `null` when the last
page has been reached.

```typescript
type FetchMessagesResponse = {
    message: string;
    data: {
        messages: Array<{
            id: number;
            text: string;
            createdAt: Date;
        }>;
        nextCursor: number | null;
    };
};
```

**Example:** `GET /api/messages?limit=2`

```json
{
    "message": "Messages fetched successfully.",
    "data": {
        "messages": [
            {
                "id": 5,
                "text": "Newest message",
                "createdAt": "2024-01-15T12:00:00.000Z"
            },
            {
                "id": 4,
                "text": "Another message",
                "createdAt": "2024-01-15T11:00:00.000Z"
            }
        ],
        "nextCursor": 4
    }
}
```

Fetch the next page with `GET /api/messages?limit=2&cursor=4`.

---

## Error Responses

All errors follow the standard format:

```typescript
type ErrorResponse = {
    statusCode: number;
    error: string;
    message: string;
};
```

### Available Errors

| Status | Error               | When                                  |
|--------|---------------------|---------------------------------------|
| 400    | Bad Request         | Validation failed (missing/invalid fields) |
| 404    | Not Found           | Message not found (findUniqueOrFail)  |
| 500    | Internal Server Error | Database or server errors           |

---

## Architecture

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────────┐    ┌──────────┐
│  Route  │ -> │ Handler │ -> │ Service │ -> │ Repository │ -> │ Database │
└─────────┘    └─────────┘    └─────────┘    └────────────┘    └──────────┘
```

### Files

| File                    | Purpose                                          |
|-------------------------|--------------------------------------------------|
| `index.ts`              | Module entry, exports `autoPrefix`               |
| `message.route.ts`      | Tag, route enum and route definitions with Zod   |
| `message.handler.ts`    | `MessageHandler` type, request/response handling |
| `message.service.ts`    | `MessageService` type, business logic            |
| `message.type.ts`       | Payload types for the module utilities           |
| `message.util.ts`       | Module utilities (`diffObjects` example)         |

### Related Files

| Path                                           | Purpose              |
|------------------------------------------------|----------------------|
| `src/lib/validation/message/message.schema.ts` | Zod validation schemas |
| `src/database/repositories/message/`           | Data access layer    |

---

## Usage Examples

### Create Message

```bash
curl -X POST http://localhost:3000/api/messages/ \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!"}'
```

### Fetch Messages (paginated)

```bash
# first page
curl "http://localhost:3000/api/messages?limit=2"

# next page, using nextCursor from the previous response
curl "http://localhost:3000/api/messages?limit=2&cursor=4"
```

---

## Validation Schemas

Defined in `src/lib/validation/message/message.schema.ts`:

```typescript
import { z } from "zod";

const createMessageBodySchema = z.object({
    text: z.string(),
});

const defaultMessageSchema = z.object({
    id: z.number(),
    text: z.string(),
    createdAt: z.date(),
});

const createMessageResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        message: defaultMessageSchema,
    }),
});

const fetchMessagesQuerySchema = z.object({
    cursor: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

const fetchMessagesResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        messages: z.array(defaultMessageSchema),
        nextCursor: z.number().nullable(),
    }),
});
```

Response messages come from `RESPONSE_MESSAGES.message` in
`src/lib/messages/messages.constant.ts` — `created`, `fetched` and `notFound`.

---

## Repository Methods

`MessageRepository` is `BaseRepository<typeof messages>` (the shared CRUD surface wired by
`generateRepository`) plus one hand-written method. Every method takes a single options
object and accepts an optional `tx` to run inside a transaction:

| Method                        | Description                                        |
|-------------------------------|----------------------------------------------------|
| `create`, `createMany`        | Insert one or many messages                        |
| `findFirst`, `findMany`, `count` | Read messages                                   |
| `update`                      | Update messages matching a `where` expression      |
| `delete`                      | Delete messages matching a `where` expression      |
| `findByIdOrFail`              | Find by id or throw `NotFoundError` with `notFound`|
| `findPage`                    | Cursor-paginated page (`{ items, nextCursor }`) newest-first by `id` |

The current endpoints use `create` and `findPage`; `findByIdOrFail` is available for
routes that fetch a single message. `findPage` builds its cursor `where`/`orderBy`
internally, so the service only passes `{ cursor, limit }`.

---

## Dependencies

Injected via Awilix DI container:

| Dependency          | Type               | Used In      |
|---------------------|--------------------|--------------|
| `messageRepository` | `MessageRepository`| Service      |
| `log`               | `FastifyBaseLogger`| Service      |
| `config`            | `EnvConfig`        | Service      |
| `messageService`    | `MessageService`   | Handler      |
