# PrimeSoft Alliance - Phase 1: Architecture & Models

## 1. Unified Platform Architecture
The PrimeSoft Alliance system operates as a single unified backend powering multiple interfaces. It enforces strict separation of concerns into four distinct layers.

### Layer 1: Core API
- **Nature**: Stateless, horizontally scalable RESTful API built to handle requests from any HTTP client.
- **Responsibilities**: Houses the core intelligence, routing, data validation, role-based access control (RBAC), and tenant isolation. 
- **Modules**: Chat (SSE stream & REST), Bookings, Contacts/Leads, Universal Forms, Content, Media (Presigned URLs), Analytics, Webhooks, Auth, Quotas.

### Layer 2: Superadmin Dashboard
- **Nature**: A separate Single Page Application (SPA) restricted to platform administrators.
- **Responsibilities**: Internal platform control.
- **Capabilities**: Manage all clients (cross-tenant), generate onboarding invites, govern quotas, manage global master templates, view system health, and inspect audit logs.

### Layer 3: Client Dashboard
- **Nature**: A multi-tenant SPA where access is strictly confined to the logged-in user's `clientId`.
- **Responsibilities**: Tenant-specific business operations.
- **Capabilities**: Manage bookings, review and update leads, configure AI instructions (`ai_configs`), set availability, publish client-specific content, review usage vs quotas.

### Layer 4: Public Website Widget / SDK
- **Nature**: Interface layer (Vanilla JS, React, Vue, iOS, Android, Server-to-Server).
- **Responsibilities**: Renders the chatbot, lead capture forms, scheduling UI, and content blocks.
- **Behavior**: Communicates entirely via the Public API, using read-only API keys or session tokens spawned by the widget. It holds zero business logic itself.

---

## 2. Shared Tenant Model
Every entity (except Superadmins and Platform Defaults) is tightly coupled to a `clientId`.

### Strict Tenancy Rules:
1. **Implicit Scoping**: Middleware automatically extracts `clientId` from the authenticated Token or API Key.
2. **Database Level**: Every query MUST include `clientId: req.tenant.clientId` (unless executed by a Superadmin role).
3. **Storage Scoping**: Object Storage (S3) partitions media into `/{clientId}/media/...`.
4. **Subdomain Routing**: Optional. `tenant.your-app.onrender.com` directly resolves to `clientId`.

---

## 3. Database Schema Models (Core Entities)

*Note: All schemas include `createdAt` and `updatedAt` timestamps.*

**Platform & Access**
- **Clients**: `clientId` (PK), `businessName`, `businessType`, `email`, `phone`, `status` (active/suspended), `plan`, `onboardingStatus`, `domainMapping`
- **Invites**: `inviteId` (PK), `clientId`, `token` (hashed), `expiresAt`, `status` (pending, used, expired), `customFields`
- **Users**: `userId` (PK), `clientId` (FK), `email`, `passwordHash`, `role` (superadmin, admin, agent, viewer), `status`
- **Quotas**: `clientId` (FK), `aiMessagesUsed`, `aiMessageLimit`, `storageUsed`, `storageLimit`, `bookingCount`, `resetDate`
- **UsageStats**: `clientId` (FK), `month`, `metrics` (JSON metrics payload)

**Business Operations**
- **Settings**: `clientId` (FK), `workingHours` (JSON), `branding` (JSON), `aiInstructions`
- **Services**: `serviceId` (PK), `clientId` (FK), `name`, `duration`, `price`, `description`
- **Availability**: `clientId` (FK), `schedule` (JSON, timezone-aware overrides)
- **Bookings**: `bookingId` (PK), `clientId` (FK), `serviceId` (FK), `customerName`, `email`, `phone`, `date` (YYYY-MM-DD), `time`, `timezone`, `status` (pending, confirmed, cancelled), `notes`
- **Contacts (Leads)**: `contactId` (PK), `clientId` (FK), `name`, `email`, `phone`, `message`, `status` (new, contacted, resolved)

**Forms & Submissions**
- **Forms**: `formId` (PK), `clientId` (FK), `name`, `schema` (JSON definition of fields)
- **FormSubmissions**: `submissionId` (PK), `formId` (FK), `clientId` (FK), `data` (JSON), `status`

**Content & Media**
- **ContentItems**: `contentId` (PK), `clientId` (FK), `type` (text, image, markdown, url, embed), `title`, `slug`, `body`, `status` (draft, published), `version`, `locale`, `tags`, `mediaReferences` (Array)
- **ContentVersions**: `versionId` (PK), `contentId` (FK), `clientId` (FK), `snapshot` (JSON), `versionNumber`
- **MediaAssets**: `mediaId` (PK), `clientId` (FK), `type`, `filename`, `mimeType`, `size`, `url`, `storageProvider`, `uploadStatus`

**AI & Chat**
- **ChatSessions**: `sessionId` (PK), `clientId` (FK), `status`, `intent`, `context` (JSON)
- **ChatMessages**: `messageId` (PK), `sessionId` (FK), `clientId` (FK), `role` (user/ai/system), `content`

**Infrastructure**
- **Webhooks**: `webhookId` (PK), `clientId` (FK), `endpointUrl`, `events` (Array), `secret`, `status`
- **WebhookDeliveries**: `deliveryId` (PK), `webhookId` (FK), `clientId` (FK), `event`, `payload`, `responseCode`, `status` (success, failed, retrying)
- **AuditLogs**: `logId` (PK), `clientId` (FK), `actorId`, `action`, `resource`, `metadata`

---

## 4. Onboarding Workflow

The flow strictly securely interconnects Superadmin provisioning with end-client setup.

- **Step 1: Superadmin creates invite.**
  - Calls `POST /v1/admin/invites` payload: `{ email, plan, suggestedSubdomain }`.
  - Backend generates a secure JWT token (valid for 72h).
- **Step 2: Client opens invite link.**
  - `GET /v1/invites/validate?token=...` -> confirms not expired and not used.
  - SPA renders the Onboarding multi-step form.
- **Step 3: Client submits onboarding form.**
  - Collects Business Name, Hours, Services, Branding, User Password, AI Instructions.
- **Step 4: Backend provisions tenant.**
  - Creates `Client` record. Yields `clientId`.
  - Creates `User` account mapped to `clientId` with `admin` role.
  - Populates `Settings`, `Services`, `Availability`, and `Quotas`.
- **Step 5: Invite is consumed.**
  - `Invite.status` explicitly marked `used`.
  - Grants User JWT. Redirects to Layer 3 (Client Dashboard).

---

## 5. Dashboard Boundaries

**Superadmin Access (Role: `superadmin`, `clientId`: 'SYSTEM')**
- Has implicit override flags to read any `clientId` database record.
- Only users with `role: superadmin` can access `/v1/admin/*` endpoints.
- Manages global metrics and limits.
- Identifies system-wide abuse.

**Client Access (Role: `admin`, `agent`, `clientId`: 'uuid')**
- JWT tokens embed their exact `clientId`.
- If an agent requests `/v1/bookings`, the API explicitly rewrites the query to `SELECT * FROM bookings WHERE clientId = 'uuid'`.
- Attempting to overwrite the `clientId` payload manually fails JSON schema validation and throws 403 Forbidden.
- Cannot mutate master templates or bypass allocated quotas.

---

## 6. API Module Map

1. **Authentication:** `/v1/auth/*`
2. **Chat:** `/v1/chat/*`
3. **Booking:** `/v1/bookings` & `/v1/availability`
4. **Contacts/Leads:** `/v1/leads`
5. **Forms:** `/v1/forms/*`
6. **Content Management:** `/v1/content/items`
7. **Media Management:** `/v1/content/media`
8. **Templates:** `/v1/templates`
9. **Quotas & Usage:** `/v1/usage`
10. **Analytics:** `/v1/analytics/*`
11. **Webhooks:** `/v1/webhooks/*`
12. **SDK Config:** `/v1/sdk/*`
13. **Admin:** `/v1/admin/*`
