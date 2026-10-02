# Message Module

API module for managing messages in the system.

Write operations (create, update, delete) are **asynchronous**: the HTTP endpoint
validates the request, enqueues a job on the BullMQ `message` queue and returns
the message `id` and the `jobId` (`202 Accepted` for create, `200 OK` for update and delete). A background worker consumes the job, performs the
database write and invalidates the list cache. Reads (`GET`) stay synchronous.

## Base Path

```
/api/messages
```

## Endpoints

| Method | Path                | Description                  | Auth |
|--------|---------------------|------------------------------|------|
| POST   | /api/messages/      | Enqueue message creation     | No   |
| PUT    | /api/messages/:id   | Enqueue message update       | No   |
| DELETE | /api/messages/:id   | Enqueue message deletion     | No   |
| GET    | /api/messages/      | Fetch messages (paginated)   | No   |

Every write returns the same envelope:

```typescript
type EnqueueMessageResponse = {
    message: string;
    data: {
        id: string;
        jobId: string;
    };
};
```

---

## POST /api/messages/

Enqueues creation of a new message. The `id` is a UUID v7: the client may send its own
(must be v7 — anything else is `400`), otherwise the API takes one from Postgres
(`SELECT uuidv7()`) before enqueueing. Either way it is returned right away, so the
client can address the message before the worker runs. Re-sending the same `id` does
not create a second message — the worker upserts by it. A client-chosen `id` also sets
the message's position in the newest-first list, since v7 ids are time-ordered.

### Request

**Body** (application/json):

```typescript
type CreateMessageInput = {
    id?: string;
    text: string;
    meta?: MessageMeta;
};
```

### Response

**Status:** 202 Accepted

```json
{
    "message": "Message creation has been queued.",
    "data": { "id": "019a3b1c-5e2f-7a4d-8b6c-1d2e3f4a5b6c", "jobId": "1" }
}
```

### Errors

| Status | Error       | Description                     |
|--------|-------------|---------------------------------|
| 400    | Bad Request | Invalid or missing `text` field |
---

## PUT /api/messages/:id

Enqueues an update of an existing message. At least one of `text` / `meta` must be
provided; `meta: null` clears the stored meta. The message must exist when the request
arrives — otherwise `404` and no job is enqueued, so an update sent right after a create
gets `404` until the worker has stored the message.

### Request

**Params:** `id` (UUID v7)

**Body** (application/json):

```typescript
type UpdateMessageInput = {
    text?: string;
    meta?: MessageMeta | null;
};
```

### Response

**Status:** 200 OK

```json
{
    "message": "Message update has been queued.",
    "data": { "id": "019a3b1c-5e2f-7a4d-8b6c-1d2e3f4a5b6c", "jobId": "2" }
}
```

---

## DELETE /api/messages/:id

Enqueues deletion of a message. An unknown `id` (including one whose create is still
queued) returns `404` and no job is enqueued.

### Request

**Params:** `id` (UUID v7)

### Response

**Status:** 200 OK

```json
{
    "message": "Message deletion has been queued.",
    "data": { "id": "019a3b1c-5e2f-7a4d-8b6c-1d2e3f4a5b6c", "jobId": "3" }
}
```

---

## GET /api/messages/

Fetches messages from the database with cursor pagination, newest first. Ids are UUID v7
(time-ordered), so `ORDER BY id DESC` is creation order; ids created within the same
millisecond have no defined order among themselves.

### Request

**Query:**

| Param  | Type   | Default | Description                        |
|--------|--------|---------|------------------------------------|
| limit  | number | 20      | Page size (max 100)                |
| cursor | uuid   | —       | Last seen id from the previous page |

### Response

**Status:** 200 OK

```typescript
type FetchMessagesResponse = {
    message: string;
    data: {
        messages: Array<{
            id: string;
            text: string;
            createdAt: Date;
            meta: MessageMeta | null;
        }>;
        nextCursor: string | null;
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
`MessageService` method.

### Delivery semantics

BullMQ delivers a job **at least once** (failed attempts are retried, a stalled job is
re-run), so every write is safe to repeat:

- **create** — the job always carries the row's `id` (client-provided or taken from
  Postgres at enqueue time); the worker upserts by it, so a re-run returns the same row
  instead of inserting a duplicate.
- **update** — last write wins by **enqueue time** (`job.timestamp`), not processing
  time. `updatedAt` (`@updatedAt`) stores the enqueue time of the last applied write —
  the worker passes it explicitly, which overrides Prisma's processing-time stamp — and
  the worker only applies `updatedAt <= enqueuedAt`, so a retried job never overwrites a
  newer update. A skipped stale write still completes the job. Any other write path
  that leaves `updatedAt` to Prisma stamps its real write time, so updates enqueued
  before it correctly lose to it.
- **delete** — `deleteMany`, a repeat is a no-op.

Failures that repeat on every attempt — invalid job data, a message deleted in the
meantime, an unknown job name — are thrown as `UnrecoverableError` and fail without
retries. Anything else (DB/Redis down) is retried 3 times with exponential backoff.

Enqueueing uses its own Redis connection with the offline queue off: if Redis is down,
a write request fails right away with `500` instead of hanging until Redis is back.

### Files

| File                    | Purpose                                            |
|-------------------------|----------------------------------------------------|
| `index.ts`              | Module entry, exports `autoPrefix`                 |
| `message.route.ts`      | Tag, route enum and route definitions with Zod     |
| `message.handler.ts`    | `MessageHandler` type, request/response handling   |
| `message.service.ts`    | `MessageService` type, DB writes and reads         |
| `message.constant.ts`   | Cache/rate-limit constants                         |
| `message.type.ts`       | Service payload types                              |
| `mq/message.service.ts` | `MessageJobService` — enqueue + job dispatch       |
| `mq/message.constant.ts`| Queue name, job names, default job options         |
| `mq/message.type.ts`    | Job-data, job-result and enqueue payload types     |
| `mq/message.queue.ts`   | `configureMessageQueue` — BullMQ `Queue` lifecycle |
| `mq/message.worker.ts`  | `configureMessageWorker` — BullMQ `Worker` lifecycle |
| `message.util.ts`       | Module utilities (`diffObjects` example)           |

### Related Files

| Path                                           | Purpose                          |
|------------------------------------------------|----------------------------------|
| `src/lib/validation/message/message.schema.ts` | Zod validation & job-data schemas |
| `src/database/repositories/message/`           | Data access layer                |
| `src/plugins/mq/message/message.queue.ts`     | Thin `fp` wrapper registering `configureMessageQueue` |
| `src/plugins/mq/message/message.worker.ts`    | Thin `fp` wrapper registering `configureMessageWorker` |
| `src/plugins/bullmq.ts`                        | ioredis connections for BullMQ: blocking (workers) and fail-fast (producers) |

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

The worker uses `upsert`, `updateMany` and `deleteMany`; the enqueue existence check
and the stale-update check use `findUniqueOrFail`; reads use `findMany`.

---

## Dependencies

Injected via Awilix DI container:

| Dependency          | Type                | Used In         |
|---------------------|---------------------|-----------------|
| `messageRepository` | `MessageRepository` | Service, JobService |
| `messageQueue`      | `Queue`             | JobService (producer) |
| `cacheService`      | `CacheService`      | Service         |
| `log`               | `FastifyBaseLogger` | Service         |
| `config`            | `EnvConfig`         | Service         |
| `messageService`    | `MessageService`    | Handler, JobService |
| `messageJobService` | `MessageJobService` | Handler, Worker |
