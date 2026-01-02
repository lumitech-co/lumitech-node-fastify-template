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

| File                    | Purpose                              |
|-------------------------|--------------------------------------|
| `index.ts`              | Module entry, exports `autoPrefix`   |
| `message.route.ts`      | Route definitions with Zod schemas   |
| `message.handler.ts`    | Request/response handling            |
| `message.service.ts`    | Business logic                       |

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

const messageSchema = z.object({
    id: z.number(),
    text: z.string(),
    createdAt: z.date(),
});

const createMessageResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        message: messageSchema,
    }),
});

const fetchMessagesResponseSchema = z.object({
    message: z.string(),
    data: z.object({
        messages: z.array(messageSchema),
    }),
});
```

---

## Repository Methods

The `MessageRepository` extends `BaseRepository<"message">` with:

| Method            | Description                                    |
|-------------------|------------------------------------------------|
| `create`          | Create a new message                           |
| `findMany`        | Fetch all messages                             |
| `findUnique`      | Find message by unique field                   |
| `findUniqueOrFail`| Find or throw NotFoundError                    |
| `update`          | Update a message                               |
| `delete`          | Delete a message                               |

---

## Dependencies

Injected via Awilix DI container:

| Dependency          | Type               | Used In      |
|---------------------|--------------------|--------------|
| `messageRepository` | `MessageRepository`| Service      |
| `log`               | `FastifyBaseLogger`| Service      |
| `config`            | `EnvConfig`        | Service      |
| `messageService`    | `MessageService`   | Handler      |
