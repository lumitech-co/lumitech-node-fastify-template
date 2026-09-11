# Message Module

API module for managing messages in the system.

Write operations (create, update, delete) are **asynchronous**: the HTTP endpoint
validates the request, enqueues a job on the BullMQ `message` queue and returns
`202 Accepted` with the `jobId`. A background worker consumes the job, performs the
database write and invalidates the list cache. Reads (`GET`) stay synchronous.

## Base Path

```
/api/messages
```

## Endpoints

| Method | Path                | Description                  | Auth |
|--------|---------------------|------------------------------|------|
| POST   | /api/messages/      | Enqueue message creation     | No   |
| PATCH  | /api/messages/:id   | Enqueue message update       | No   |
| DELETE | /api/messages/:id   | Enqueue message deletion     | No   |
| GET    | /api/messages/      | Fetch messages (paginated)   | No   |

Every write returns the same envelope:

```typescript
type EnqueueMessageResponse = {
    message: string;
    data: {
        jobId: string;
    };
};
```

---

## POST /api/messages/

Enqueues creation of a new message.

### Request

**Body** (application/json):

```typescript
type CreateMessageInput = {
    text: string;
    meta?: MessageMeta;
};
```

### Response

**Status:** 202 Accepted

```json
{
    "message": "Message creation has been queued.",
    "data": { "jobId": "1" }
}
```

### Errors

| Status | Error       | Description                     |
|--------|-------------|---------------------------------|
| 400    | Bad Request | Invalid or missing `text` field |

---

## PATCH /api/messages/:id

Enqueues an update of an existing message. At least one of `text` / `meta` must be
provided. A missing message surfaces as a failed job (worker side), not an HTTP error.

### Request

**Params:** `id` (positive integer)

**Body** (application/json):

```typescript
type UpdateMessageInput = {
    text?: string;
    meta?: MessageMeta;
};
```

### Response

**Status:** 202 Accepted

```json
{
    "message": "Message update has been queued.",
    "data": { "jobId": "2" }
}
```

---

## DELETE /api/messages/:id

Enqueues deletion of a message.

### Request

**Params:** `id` (positive integer)

### Response

**Status:** 202 Accepted

```json
{
    "message": "Message deletion has been queued.",
    "data": { "jobId": "3" }
}
```

---

## GET /api/messages/

Fetches messages from the database with cursor pagination.

### Request

**Query:**

| Param  | Type   | Default | Description                        |
|--------|--------|---------|------------------------------------|
| limit  | number | 20      | Page size (max 100)                |
| cursor | number | —       | Last seen id from the previous page |

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
            meta: MessageMeta | null;
        }>;
        nextCursor: number | null;
    };
};
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

| Status | Error               | When                                       |
|--------|---------------------|--------------------------------------------|
| 400    | Bad Request         | Validation failed (missing/invalid fields) |
| 404    | Not Found           | Message not found (findUniqueOrFail)       |
| 500    | Internal Server Error | Database or server errors                |

---

## Architecture

```
Write path:
┌─────────┐   ┌─────────┐   ┌───────────────┐   ┌───────────────┐
│  Route  │-> │ Handler │-> │ Service        │-> │ BullMQ Queue  │
└─────────┘   └─────────┘   │ (enqueue*)     │   │ "message"     │
                            └───────────────┘   └───────┬───────┘
                                                        │
┌──────────┐   ┌────────────┐   ┌───────────────┐   ┌───▼───────────┐
│ Database │<- │ Repository │<- │ Service        │<- │ BullMQ Worker │
└──────────┘   └────────────┘   │ (process*)     │   │ (processor)   │
                                └───────────────┘   └───────────────┘

Read path:
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌────────────┐   ┌──────────┐
│  Route  │-> │ Handler │-> │ Service │-> │ Repository │-> │ Database │
└─────────┘   └─────────┘   └─────────┘   └────────────┘   └──────────┘
```

The queue processor lives in the worker plugin: it Zod-validates `job.data` and
dispatches on `job.name` (`create` / `update` / `delete`) to the matching
`process*` service method.

### Files

| File                    | Purpose                                            |
|-------------------------|----------------------------------------------------|
| `index.ts`              | Module entry, exports `autoPrefix`                 |
| `message.route.ts`      | Tag, route enum and route definitions with Zod     |
| `message.handler.ts`    | `MessageHandler` type, request/response handling   |
| `message.service.ts`    | `MessageService` type, enqueue + process logic     |
| `message.constant.ts`   | Cache/rate-limit constants, queue name, job names  |
| `message.type.ts`       | Payload, job-data and job-result types             |
| `message.queue.ts`      | `configureMessageQueue` — BullMQ `Queue` lifecycle |
| `message.worker.ts`     | `configureMessageWorker` — BullMQ `Worker` lifecycle |
| `message.util.ts`       | Module utilities (`diffObjects` example)           |

### Related Files

| Path                                           | Purpose                          |
|------------------------------------------------|----------------------------------|
| `src/lib/validation/message/message.schema.ts` | Zod validation & job-data schemas |
| `src/database/repositories/message/`           | Data access layer                |
| `src/plugins/messageQueue.ts`                  | Thin `fp` wrapper registering `configureMessageQueue` |
| `src/plugins/messageWorker.ts`                 | Thin `fp` wrapper registering `configureMessageWorker` |
| `src/plugins/bullmq.ts`                        | Shared ioredis connection for BullMQ |

---

## Response Messages

From `RESPONSE_MESSAGES.message` in `src/lib/messages/messages.constant.ts`:
`createQueued`, `updateQueued`, `deleteQueued`, `fetched`, `notFound`.

---

## Repository Methods

`MessageRepository` is `BaseRepository<"message">` (the Prisma delegate methods wired by
`generateRepository`) plus one hand-written method:

| Method                                         | Description                                   |
|------------------------------------------------|-----------------------------------------------|
| `create`, `createMany`                         | Insert one or many messages                   |
| `findUnique`, `findFirst`, `findMany`, `count` | Read messages                                 |
| `update`, `updateMany`, `upsert`               | Update messages                               |
| `delete`, `deleteMany`                         | Delete messages                               |
| `findUniqueOrFail`                             | Find or throw `NotFoundError` with `notFound` |

The worker uses `create`, `update` and `delete`; reads use `findMany`.

---

## Dependencies

Injected via Awilix DI container:

| Dependency          | Type                | Used In         |
|---------------------|---------------------|-----------------|
| `messageRepository` | `MessageRepository` | Service         |
| `messageQueue`      | `Queue`             | Service (producer) |
| `cacheService`      | `CacheService`      | Service         |
| `log`               | `FastifyBaseLogger` | Service         |
| `config`            | `EnvConfig`         | Service         |
| `messageService`    | `MessageService`    | Handler, Worker |
