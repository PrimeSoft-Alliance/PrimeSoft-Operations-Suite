# SaaS Platform Architecture

## 1. Executive Summary

The SaaS platform is a multi-tenant, API-first platform designed to provide a unified backend for AI chatbots, bookings, contacts, forms, content management, and analytics. It is built to serve any client—from embedded browser widgets to server-to-server integrations and native mobile apps—across multiple programming languages. 

The architecture strictly enforcing tenant isolation via `clientId`, utilizes asynchronous event-driven queues for background tasks, and provides horizontal scalability for high availability.

## 2. System Architecture & Topology

### High-Level Architecture Diagram (Text)

```text
                                           +-------------------+
                                           |  External Clients |
                                           | (Web, iOS, APIs)  |
                                           +---------+---------+
                                                     | HTTPS / WSS
                                                     v
                                           +-------------------+
                                           |   Cloudflare Edge |
                                           | (CDN, WAF, DDoS)  |
                                           +---------+---------+
                                                     |
                                                     v
                                           +-------------------+
                                           |  API Gateway / LB |
                                           |  (Rate Limiting,  |
                                           |   SSL Offload)    |
                                           +---------+---------+
                                                     |
            +----------------------------------------+----------------------------------------+
            |                                        |                                        |
+-----------v-----------+                +-----------v-----------+                +-----------v-----------+
|    Core API Service   |                |   AI Stream Service   |                |  Admin / Dashboards   |
| (RESTful JSON APIs,   |                | (SSE / WebSockets,    |                | (React/Vite SPA       |
|  Tenant Isolation)    |                |  LLM Integration)     |                |  served via CDN)      |
+-----------+-----------+                +-----------+-----------+                +-----------+-----------+
            |                                        |                                        |
            +--------------------+-------------------+--------------------+-------------------+
                                 |                                        |
                      +----------v----------+                  +----------v----------+
                      |   Message Broker    |                  |  Primary Database   |
                      | (Redis/RabbitMQ/    |                  | (MongoDB / Postgre) |
                      |  EventBridge)       |                  |  Tenant-partitioned |
                      +----------+----------+                  +---------------------+
                                 |
           +---------------------+---------------------+
           |                     |                     |
+----------v---------+ +---------v----------+ +--------v-----------+
|  Webhook Workers   | | Analytics Pipeline | | Background Workers |
| (Delivery, Retry)  | | (OLAP, Aggregation)| | (Email, Media Processing) |
+--------------------+ +--------------------+ +--------------------+
```

## 3. Recommended Tech Stack

- **API Layer**: Node.js + Express (or NestJS/Fastify) for flexibility, async I/O, and widespread ecosystem support.
- **Languages**: TypeScript (Strict typing for robust multi-tenant data shapes).
- **Database (OLTP)**: MongoDB (Document structure fits flexible forms, content, and tenant configs well) or PostgreSQL (with row-level security for tenant isolation).
- **Caching & Pub/Sub**: Redis (Session storage, rate limiting, rapid config lookups, WebSocket pub/sub).
- **Message Broker**: Redis Streams / RabbitMQ / AWS SQS (For webhooks, email sending, heavy media processing).
- **Storage**: AWS S3 / Cloudflare R2 / Google Cloud Storage (Object storage for images, videos, documents).
- **LLM Integration**: Groq / Google Gemini via official SDKs, orchestrated server-side.
- **Frontend/Dashboards**: React + Vite + Tailwind CSS.
- **Hosting / Deployment**: Docker + Kubernetes or fully managed Serverless Containers (Google Cloud Run / AWS ECS / Vercel).

## 4. Service Boundaries (Microservices / Modular Monolith)

To start, a strongly modularized monolith is recommended, with clear boundaries to allow extraction into microservices if scaling demands it:
1. **Identity & Auth Module**: Tenant provisioning, RBAC, JWT issuance, Superadmin controls.
2. **AI & Chat Module**: RAG pipeline, LLM orchestration, conversation state tracking, SSE streaming.
3. **Core Business Module**: Bookings, Contacts, Universal Forms.
4. **Content & Media Module**: Headless CMS, media upload pre-signed URLs, storage pointers.
5. **Event & Webhook Module**: Async task dispatch, webhook delivery, retry queues.
6. **Analytics Module**: Usage quota tracking, event logging, API audit logs.

## 5. Database Schema & Relationships (Tenant-First)

Every table/collection MUST have a `clientId`. Queries without `clientId` (except Superadmin) throw structural errors.

**Core Entities:**
- `Clients`: `_id`, `clientId`, `businessName`, `plan`, `status`, `createdAt`
- `Users`: `_id`, `clientId`, `email`, `passwordHash`, `role` (superadmin, admin, agent)
- `Settings`: `clientId`, `branding`, `workingHours`, `aiInstructions`

**Feature Entities:**
- `Bookings`: `_id`, `clientId`, `customerData`, `serviceId`, `startAt`, `endAt`, `status`
- `Contacts`: `_id`, `clientId`, `email`, `name`, `lifecycleStage`
- `Forms`: `_id`, `clientId`, `fieldsConfig`, `status`
- `FormSubmissions`: `_id`, `clientId`, `formId`, `payload`, `createdAt`
- `ContentItems`: `_id`, `clientId`, `type` (blog, block, page), `version`, `locale`, `data`
- `MediaAssets`: `_id`, `clientId`, `storageProvider`, `url`, `mimeType`, `size`

**Telemetry:**
- `UsageStats`: `clientId`, `month`, `apiCalls`, `aiMessages`, `storageBytes`
- `AuditLogs`: `_id`, `clientId`, `actorId`, `action`, `resource`, `timestamp`

## 6. Queues & Event Flows

**Pattern:** Outbox Pattern + Message Broker.

1. **Webhooks:**
   - Event occurs (e.g., `booking.created`).
   - Core API pushes to `webhooks_queue`.
   - `WebhookWorker` picks up the job, resolves `clientId` registered endpoints.
   - Posts payload. On failure, pushes to `webhook_retry_queue` with exponential backoff.
2. **Email & Notifications:**
   - Put onto `email_queue`. Workers process via SendGrid/Resend.
3. **Media Processing:**
   - Client requests pre-signed upload URL. Client uploads to S3 directly.
   - S3 triggers event -> pushes to `media_processing_queue` -> creates thumbnails, updates DB.

## 7. Caching & Storage Strategy

- **Caching**: 
  - Tenant configurations (AI Prompts, Business Settings) are heavily read, rarely updated. Cached in Redis (TTL: 1 hour, explicit invalidation on update).
  - Rate limits and API quota buckets stored in Redis.
- **Storage**:
  - NO binaries in the database.
  - Generative images and user uploads are routed to Object Storage (S3-compatible).
  - Database stores metadata, pre-signed URLs, and CDN paths. CDN handles global delivery.

## 8. Architecting Workflows

**Chatbot Workflow:**
1. Widget connects via REST/SSE to `/api/v1/chat/stream`. Passes `clientId`.
2. API validates quota, pulls cached AI instructions for `clientId`.
3. API retrieves conversation history.
4. Prompt is built: `[System Config] + [History] + [User Message]`.
5. LLM generates stream -> SSE streams back to user. Usage is incremented via async queue.

**Booking Workflow:**
1. Client fetches `/api/v1/availability?clientId=...`.
2. Core API calculates free slots based on `Bookings` and `Settings.workingHours`.
3. Client posts to `/api/v1/bookings`.
4. API validates slot, writes DB.
5. Emits `booking.created` event -> Triggers Webhooks & Emails asynchronously.

**Content Workflow:**
1. Headless CMS approach. Admin creates `ContentItem` (Draft).
2. On publish, version increments, state -> 'published'.
3. Public API `/api/v1/content?clientId=...` only fetches `status: 'published'`.

## 9. Webhooks & Analytics

- **Webhook Security**: All webhook payloads are signed using HMAC SHA-256 with a tenant-specific `webhook_secret`. Clients verify `X-Platform-Signature`.
- **Analytics Pipeline**: High-volume events (API calls, usage) are written to a fast ingestion layer (e.g., Redis append-only or Kafka), then flushed in batches to OLAP storage (Clickhouse) or structured time-series DB for dashboard rendering. 

## 10. Security & Authorization

- **Authentication**: JWTs with short expiry + Refresh Tokens.
- **Authorization**: Role-Based Access Control (RBAC). Middleware validates `req.user.clientId === req.params.clientId` strictly.
- **Tenant Isolation**: Mandatory `clientId` injection at the ORM/Query layer.
- **API Security**: Rate limiting per `clientId` and per IP. CORS configured securely for API, wildly permissive for Widget endpoints. CSRF protection on stateful Dashboard routes.

## 11. Scaling & Deployment Strategy

- **Stateless API**: The Node.js application is strictly stateless (sessions in Redis, media in S3).
- **Horizontal Scaling**: Auto-scaling groups or K8s HPAs scale API containers based on CPU/Memory and HTTP queue depth.
- **Deployments**: CI/CD pipeline runs tests, builds Docker image, deploys via Rolling Updates or Blue/Green to ensure zero downtime.
- **Database Scaling**: Read replicas for heavy analytics/dashboard queries. Primary handles writes.

## 12. Tradeoffs & Explanations

1. **Modular Monolith vs Microservices**: Starting with a Modular Monolith inside Docker simplifies CI/CD, cross-module transactions, and operations. As the team grows, specific modules (like the heavy SSE Chat router) can be split into autonomous microservices.
2. **MongoDB vs PostgreSQL**: MongoDB was selected for its schema-less flexibility which excels with heterogeneous "Universal Forms" and "Dynamic Content Blocks". The tradeoff is lack of strict SQL relational constraints, mitigating this requires strict TypeScript schemas and ORM validation (Mongoose).
3. **SSE vs WebSockets for Chat**: Server-Sent Events (SSE) operate over standard HTTP, avoiding complex WebSocket load balancer configurations and connection-drop edge cases, while perfectly serving the unidirectional LLM streaming requirement.
4. **Direct to S3 Uploads**: Using pre-signed URLs eliminates the API server as a bottleneck for large file uploads, shifting bandwidth costs and processing overhead directly to AWS/Cloudflare.
