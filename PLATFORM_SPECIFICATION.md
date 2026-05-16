# PrimeSoft Alliance - Complete Platform Specification

## 1. Architecture Overview
PrimeSoft Alliance is a multi-tenant, API-first SaaS platform built on an asynchronous, horizontally scalable architecture.
- **API Gateway Layer**: Handles TLS termination, Rate Limiting (Redis-backed), and Routing.
- **Core API Service**: A stateless Node.js/Go/Java application acting as the primary orchestrator for CRUD operations, tenant isolation, and RBAC. 
- **AI & Stream Engine**: A specialized microservice (or internal worker pool) handling Server-Sent Events (SSE) and large language model (LLM) orchestration for chat.
- **Background Job Workers**: Processes webhook deliveries, email sending, video/image thumbnailing, and analytics aggregations via a message queue (e.g., RabbitMQ, AWS SQS, or Redis Streams).
- **Storage Subsystems**: OLTP relational/document database (e.g., PostgreSQL/MongoDB) with strict tenant partitioning. Object Storage (S3-compatible) for all media artifacts.

## 2. Database Schema Design
A multi-tenant approach using **Pool Data Isolation** where every table contains a heavily indexed `tenant_id` or `client_id` column.

**Core Tables:**
- `tenants`: id, name, domain, plan, status, created_at
- `users`: id, tenant_id, email, password_hash, role (superadmin, admin, agent), status
- `api_keys`: id, tenant_id, key_hash, scopes, expires_at 
- `chat_sessions`: id, tenant_id, end_user_id, status, context_data
- `chat_messages`: id, session_id, tenant_id, role (user/ai/system), content, metadata
- `bookings`: id, tenant_id, service_id, contact_name, contact_email, start_time, end_time, status 
- `leads`: id, tenant_id, name, email, phone, source, status, lifecycle_stage
- `forms`: id, tenant_id, name, fields_schema, status
- `form_submissions`: id, form_id, tenant_id, payload_json, status
- `content_items`: id, tenant_id, title, slug, type, body, status, version, published_at
- `media_assets`: id, tenant_id, filename, mime_type, size, s3_url, status
- `webhooks`: id, tenant_id, endpoint, events_subscribed, secret
- `webhook_deliveries`: id, webhook_id, tenant_id, payload, response_code, status
- `audit_logs`: id, tenant_id, actory_id, action, target_resource, metadata, ip_address
- `quotas`: id, tenant_id, resource_name, limit, used, reset_date

## 3. Endpoint List Map (v1)
*All routes are prefixed with `/v1`*
- **Chat**: `/chat/sessions` (POST, GET), `/chat/messages` (POST), `/chat/stream` (POST), `/chat/intent` (POST), `/chat/handoff` (POST)
- **Bookings**: `/bookings` (GET, POST), `/bookings/{id}` (GET, PATCH, DELETE), `/bookings/{id}/confirm` (POST), `/bookings/{id}/cancel` (POST), `/availability` (GET)
- **Leads**: `/leads` (GET, POST), `/leads/{id}` (GET, PATCH, DELETE), `/leads/{id}/tag` (POST)
- **Forms**: `/forms/detect` (POST), `/forms/register` (POST), `/forms/{id}` (GET, PATCH), `/forms/{id}/submissions` (POST, GET)
- **Content**: `/content/items` (GET, POST), `/content/items/{id}` (GET, PATCH, DELETE), `/content/items/{id}/publish` (POST), `/content/items/{id}/versions` (GET)
- **Media**: `/content/media` (GET, POST - requests upload URL), `/content/media/{id}` (GET, PATCH, DELETE)
- **Analytics**: `/analytics/overview` (GET), `/analytics/events` (GET)
- **Webhooks**: `/webhooks` (GET, POST), `/webhooks/{id}` (GET, PATCH, DELETE), `/webhooks/{id}/test` (POST)
- **SDK**: `/sdk/config` (GET), `/sdk/features` (GET)
- **Admin**: `/admin/tenants` (GET, POST), `/admin/usage` (GET), `/admin/roles` (POST)

## 4. Request / Response JSON Schemas
**Standard Success Envelope:**
```json
{
  "success": true,
  "request_id": "req_8bca3",
  "timestamp": "2026-05-16T12:00:00Z",
  "data": { ... },
  "meta": { "version": "v1", "tenant_id": "tenant_123" }
}
```
**Standard Error Envelope:**
```json
{
  "success": false,
  "request_id": "req_8bca3",
  "timestamp": "2026-05-16T12:00:00Z",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The provided email format is invalid.",
    "details": { "email": "Must be a valid email string" },
    "retryable": false
  }
}
```

## 5. Authentication & Authorization
- **API Clients / Frontend Widgets**: Require `Authorization: Bearer <JWT>` OR `x-api-key: <KEY>`. Operations are strictly bound to the `tenant_id` associated with the token.
- **Server to Server**: Uses long-lived, scoped API keys (`sk_prod_...`).
- **RBAC**: Handled at the middleware layer. Every endpoint specifies required roles (e.g., `['superadmin', 'admin']`). If `req.user.role` lacks possession, returns `HTTP 403 Forbidden`.

## 6. Webhook System Design
- **Registration**: Clients register HTTPS endpoints via `/v1/webhooks`.
- **Trigger**: When an event occurs (e.g., Lead Created), an event payload is pushed to an internal queue.
- **Delivery Worker**: Pops the event, computes a cryptographically secure HMAC SHA-256 signature using the client's `webhook_secret` and the raw payload.
- **Headers**: Injects `X-PrimeSoft-Signature` into the request.
- **Reliability**: If destination returns non-2xx, worker re-queues the message with Exponential Backoff (up to 5 retries over 24 hours).

## 7. Media Upload Design
To avoid bloating the API server memory limits and network I/O:
1. Client calls `POST /v1/content/media` requesting an upload with `mime_type` and `size`.
2. PrimeSoft API validates quotas and file types, then uses AWS/S3 SDK to generate a **Presigned Upload URL** (valid for 15 mins).
3. API returns the URL and a new pending `media_id` to the client.
4. Client uploads bytes directly to the object storage using the URL.
5. Storage Provider fires a notification hook back to PrimeSoft, transitioning `upload_status` from `pending` -> `completed`.

## 8. Content Management Design
- **Versioning**: `PATCH /v1/content/items/{id}` updates the draft and increments the internal `version`.
- **Publishing**: `POST /v1/content/items/{id}/publish` clones the draft properties to the published read-replica state.
- **Headless & Omnichannel**: Since content bodies can be HTML strings, Markdown, or JSON blocks (for structured rendering engines), clients can specify `Content-Type` matching their renderer expectations.

## 9. Chatbot & Booking Workflows
**Chat Workflow:**
User opens widget -> `POST /v1/chat/sessions` -> Client sends `POST /v1/chat/stream { message: "I want to book" }`. The system detects "booking" intent (RAG/LLM) -> LLM invokes an internal function mapping to `GET /v1/availability` -> LLM formats available times and streams back to the user. User picks a time -> LLM invokes booking tool -> calls `POST /v1/bookings`. All context remains within the `chat_session`.

## 10. Error Handling Design
- Generates standard, typed error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` (e.g., booking collision), `VALIDATION_FAILED`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_SERVER_ERROR`.
- Every generated error gets logged locally paired with its `request_id` for Traceability across logs and Datadog/APM.

## 11. Rate Limit & Quota Design
- **Rate Limiting**: Hard limit on HTTP requests/sec. Managed via Redis Token Bucket. E.g., `100 req/sec` per IP or specific API Key. Exceeding triggers HTTP 429.
- **Quotas**: Business-logic limits (e.g., "500 AI Messages per month" based on client's billing plan). Tracked in DB/Redis counters. Operations check quotas before execution; if exceeded, throws `QUOTA_EXCEEDED` 403 error.

## 12. Security Checklist
- [x] Input Validation & Sanitization (Zod/Joi schemas).
- [x] SQL/NoSQL Injection prevention (ORM parameterized queries).
- [x] TLS / HTTPS strictly enforced at the Edge.
- [x] Webhook Signature checking for verifying payload authenticity.
- [x] RBAC enforcement per tenant context on all restricted endpoints.
- [x] API Key prefixing and hashing (never store raw keys in DB).
- [x] Rate limiting to prevent volumetric abuse.
- [x] CORS tightly scoped for stateful dashboards, permissive for widget public APIs.
- [x] PII data masked in application and audit logs.

## 13. Deployment Considerations
- **Stateless Modules**: The API can be containerized using Docker and scaled infinitely via Kubernetes (HPA) or Cloud Run / Fargate.
- **Database Scalability**: Utilize managed databases with read replicas to handle aggressive analytical queries without impacting primary transactional write availability.
- **Edge Caching**: Cache heavily hit endpoints like `/v1/sdk/config` at the CDN layer or API gateway to reduce latency.

## 14. Testing Strategy
- **Unit Tests**: Test core logic (e.g., quota checking math, RBAC boolean logic).
- **Integration Tests**: E2E API routes testing endpoint payload structures, DB persisting behavior, and error throwing.
- **Mocking**: External LLM and Object Storage calls are mocked during tests.
- **Load Testing**: Post-deployment tests using tools like Artillery/K6 to observe queue latency and SSE proxy behavior under concurrent connection pressure.
