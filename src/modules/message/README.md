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
| GET    | /api/messages/    | Fetch all messages   | No   |

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

Fetches all messages from the database.

### Request

No parameters required.

### Response

**Status:** 200 OK

```typescript
type FetchMessagesResponse = {
    message: string;
    data: {
        messages: Array<{
            id: number;
            text: string;
            createdAt: Date;
        }>;
    };
};
```

**Example:**

```json
{
    "message": "Messages fetched successfully.",
    "data": {
        "messages": [
            {
                "id": 1,
                "text": "Hello, world!",
                "createdAt": "2024-01-15T10:30:00.000Z"
            },
            {
                "id": 2,
                "text": "Another message",
                "createdAt": "2024-01-15T11:00:00.000Z"
            }
        ]
    }
}
```

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

### Fetch All Messages

```bash
curl http://localhost:3000/api/messages/
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

const fetchMessagesResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        messages: z.array(defaultMessageSchema),
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

The current endpoints use `create` and `findMany`; `findByIdOrFail` is available for
routes that fetch a single message.

---

## Dependencies

Injected via Awilix DI container:

| Dependency          | Type               | Used In      |
|---------------------|--------------------|--------------|
| `messageRepository` | `MessageRepository`| Service      |
| `log`               | `FastifyBaseLogger`| Service      |
| `config`            | `EnvConfig`        | Service      |
| `messageService`    | `MessageService`   | Handler      |
