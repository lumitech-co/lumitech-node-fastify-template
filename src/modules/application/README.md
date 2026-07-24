# Application Module

Service-level module for application-wide endpoints. Currently exposes the health check
used by Docker, load balancers and uptime probes.

## Base Path

```
/api
```

## Endpoints

| Method | Path        | Description                    | Auth |
|--------|-------------|--------------------------------|------|
| GET    | /api/ping   | Check application health status | No   |

---

## GET /api/ping

Returns a plain string confirming the server is up and able to serve requests.

### Request

No parameters required.

### Response

**Status:** 200 OK

```typescript
type HealthCheckResponse = string;
```

**Example:**

```json
"pong"
```

The body value is the `HEALTH_CHECK_RESPONSE` constant in `application.constant.ts` — it is a
response payload, not a client-facing message, so it does not live in `RESPONSE_MESSAGES`.

---

## Architecture

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  Route  │ -> │ Handler │ -> │ Service │
└─────────┘    └─────────┘    └─────────┘
```

The module has no repository: the health check does not touch the database.

### Files

| File                       | Purpose                                              |
|----------------------------|------------------------------------------------------|
| `index.ts`                 | Module entry, exports `autoPrefix`                   |
| `application.route.ts`     | Tag, route enum and route definitions with Zod       |
| `application.handler.ts`   | `ApplicationHandler` type, request/response handling |
| `application.service.ts`   | `ApplicationService` type, business logic            |
| `application.constant.ts`  | `HEALTH_CHECK_RESPONSE` payload value                |

### Related Files

| Path                                                   | Purpose                |
|--------------------------------------------------------|------------------------|
| `src/lib/validation/application/application.schema.ts` | Zod validation schemas |

---

## Usage Examples

### Health Check

```bash
curl http://localhost:3000/api/ping
```

---

## Validation Schemas

Defined in `src/lib/validation/application/application.schema.ts`:

```typescript
import { z } from "zod";

const healthCheckResponseSchema = z.string();
```

---

## Dependencies

Injected via Awilix DI container:

| Dependency             | Type                 | Used In |
|------------------------|----------------------|---------|
| `applicationService`   | `ApplicationService` | Handler |

The service itself has no dependencies.
