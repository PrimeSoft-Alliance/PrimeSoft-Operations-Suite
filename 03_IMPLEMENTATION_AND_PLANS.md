# PrimeSoft Alliance - Phase 3: Implementation & Plans

## 1. Implementation Order
Rolling out the PrimeSoft SaaS implies a phased architectural deployment.

**Phase 1: Foundation (Weeks 1-2)**
- Set up Base Architecture (Node.js/Go, Core Router, Global Database).
- Implement Tenant Data Model, RBAC Middleware, Authentication, and Rate Limiting.
- Implement `/v1/admin/tenants` and `/v1/auth/*` endpoints.

**Phase 2: Core Workflows (Weeks 3-5)**
- Implement Bookings, Availability checks, and Contacts/Leads CRUD.
- Build Unified Forms Engine (dynamic schema parsing).
- Set up Client Dashboard SPA integrating these specific endpoints.

**Phase 3: AI & Communication (Weeks 6-8)**
- Integrate LLM Service (Gemini/Groq SDKs).
- Implement Server-Sent Events (SSE) router for `/v1/chat/stream`.
- Implement RAG (Retrieval-Augmented Generation) pipeline mapping Business Settings and Content into prompt arrays context.

**Phase 4: Content & Media (Weeks 9-10)**
- Integrate S3-compatible Object Storage for Media.
- Build Headless CMS capability (`/v1/content/*`).
- Link Web Widgets to fetch configurations securely.

**Phase 5: Platform Scalability (Weeks 11-12)**
- Implement Queue Workers (Redis Streams / RabbitMQ).
- Implement Webhook Dispatcher and Exponential Backoff Retries.
- Finalize Superadmin dashboards, Audit Logs, and real-time Quota enforcement.

---

## 2. Testing Strategy
- **Unit Testing (Jest/Vitest)**: Functional tests covering RBAC tenant checks, JSON schema validation logic, and token verification.
- **Integration Testing (Supertest)**: E2E API requests validating `clientId` isolation. (e.g., Asserting Client A cannot patch Client B's Booking, returning 404/403).
- **Mocking**: Overriding AI endpoints and S3 Signed URL generators.
- **Load Testing (Artillery / K6)**: Simulating multiple tenants executing chat streams (SSE) concurrently to ascertain API memory pressure limits and configure automatic pod scaling rules.

---

## 3. Deployment Strategy
- **Dockerization**: Containers ensure language-agnostic staging. One unified Docker image for the API, distinct images for the Dashboards.
- **Orchestration (Kubernetes / ECS / Cloud Run)**: 
  - API pods auto-scale on CPU/Memory usage.
  - Asynchronous background worker pods scale independently based on queue depth (e.g., KEDA).
- **Database Migrations**: Handled via robust migration logic (e.g., Prisma, Knex, or Flyway) deployed inside pipeline logic before app rotation to ensure zero downtime.
- **CDN / WAF**: Cloudflare acts as the edge layer. It caches `/v1/sdk/config` aggressively and provides DDoS mitigation.

---

## 4. Security Checklist & RBAC Plan
Being a multi-tenant platform, security lapses equal complete trust failure.

- [x] **Tenant Separation**: SQL `WHERE clientId = ?` or Mongoose `find({ clientId })` injected systematically via a trusted base service class. (NO manual injections to prevent developer error).
- [x] **Data at Rest**: AES-256 for database volumes.
- [x] **Data in Transit**: Strict TLS 1.2+ configuration.
- [x] **API Key Security**: Stored as hashes using bcrypt/Argon2. Only the short-lived JWT is exposed dynamically.
- [x] **Injection Prevention**: Parameterized queries. No raw eval() or unprotected shell spawns. Input sanitized via strict schemas (e.g., Zod).
- [x] **XSS (Cross-Site Scripting)**: User-generated content is sanitized prior to rendering. Dashboards utilize strict CSP (Content Security Policy) headers.
- [x] **SSRF (Server-Side Request Forgery)**: Blocked heavily. Webhooks validate destination URLs before firing to disallow probing internal networks (e.g., AWS Metadata endpoints).
- [x] **CSRF**: Dashboards communicating via cookie-based sessions utilize SameSite strict cookies + CSRF tokens. Public APIs utilize Bearer Tokens.
- [x] **Rate Limiting**: Throttling by combination of IP Address & `clientId` using Redis Token Bucket.
- [x] **Audit Trails**: Critical operations (Deleting a webhook, Publishing content, Altering Services) are logged asynchronously to the `AuditLogs` table.

---

## 5. Observability & Health
- **`/v1/admin/health`**: Extensive check of DB connection, Queue Depth, Memory Usage, and downstream AI integration viability.
- **Distributed Tracing**: Implement OpenTelemetry headers passing `request_id` context to trace latency from edge to DB and back.
- **Log Masking**: Custom logger automatically redacts `password`, `token`, `secret`, `credit_card` fields before writing to output streams or Datadog.
