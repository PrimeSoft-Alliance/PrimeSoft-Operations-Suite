# Phase 2: API & Schemas

## 1. Standard API Conventions
- **Base URL:** `https://your-platform.com/v1` (replace with your actual domain)
- **Content-Type:** `application/json`
- **Authentication:** `Authorization: Bearer <Token>`
- **Headers:** 
  - `Idempotency-Key: <unique-uuid>` (for `POST` methods)
  - `x-api-version: 2026-05-16` (optional version pinning)

## 2. Standard Response Envelopes

**Success Envelope:**
```json
{
  "success": true,
  "request_id": "req_8bca3fd1",
  "timestamp": "2026-05-16T12:00:00Z",
  "data": { "id": "123", "value": "..." },
  "meta": {
    "clientId": "client_abc987",
    "version": "v1",
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 142
    }
  }
}
```

**Error Envelope:**
```json
{
  "success": false,
  "request_id": "req_8bca3fd1",
  "timestamp": "2026-05-16T12:00:00Z",
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request payload failed schema validation.",
    "details": {
      "email": "Must be a valid email address.",
      "serviceId": "Service does not exist for this tenant."
    },
    "retryable": false
  }
}
```

## 3. Core Error Codes
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409) - e.g., Booking slot already taken.
- `VALIDATION_FAILED` (422)
- `RATE_LIMIT_EXCEEDED` (429)
- `QUOTA_EXCEEDED` (402/403) - e.g., Max AI messages consumed.
- `SERVER_ERROR` (500)
- `SERVICE_UNAVAILABLE` (503)

---

## 4. Endpoint Specifications & Schemas

### 4.1 Chat & Streaming
`POST /v1/chat/stream`
- **Auth**: API Key or Bearer Token.
- **Request**:
  ```json
  {
    "sessionId": "sess_123",
    "message": "Do you offer emergency plumbing?"
  }
  ```
- **Behavior**: Uses SSE (`text/event-stream`). Orchestrates context retrieval, checks `ai_configs`, and outputs tokens transparently.
- **Schema Model (`ai_configs`)**:
  ```json
  {
    "clientId": "client_abc",
    "language": "en",
    "tone": "professional",
    "fallbackText": "Please call our office for complex inquiries.",
    "allowedActions": ["booking", "lead_capture", "content_search"]
  }
  ```

### 4.2 Bookings
`POST /v1/bookings`
- **Idempotency**: Strictly enforced.
- **Request**:
  ```json
  {
    "serviceId": "srv_456",
    "customerName": "John Doe",
    "email": "john@example.com",
    "date": "2026-05-20",
    "time": "14:00",
    "notes": "Gate code is 1234"
  }
  ```

### 4.3 Content Management
`POST /v1/content/items`
- **Request**:
  ```json
  {
    "type": "rich-text",
    "title": "Summer Service Guide",
    "slug": "summer-service-guide",
    "body": "<html>...</html>",
    "status": "published",
    "locale": "en_US",
    "mediaReferences": ["media_789"],
    "tags": ["guide", "summer"]
  }
  ```
`POST /v1/content/items/{content_id}/versions`
- Rolls back or retrieves version histories. Deep clones old states.

### 4.4 Media Uploads (Presigned Strategy)
`POST /v1/content/media/upload-url`
- **Request**: `{ "filename": "logo.png", "mimeType": "image/png", "size": 102450 }`
- **Response**: Yields `uploadUrl` (AWS S3 PUT signed URL) and `mediaId`.
- **Flow**: Direct client-to-storage upload bypassing Node servers. Storage emits an event back to update `uploadStatus: "completed"`.

### 4.5 Webhooks
- **Event Catalog**: `chat.message.received`, `booking.created`, `lead.created`, `content.published`.
- **Signature Security**:
  All webhook POSTs include `X-Platform-Signature: t={timestamp},v1={hmac-sha256}`.
  Generated via `HMAC(secret, payload)`.
- **Schema (`WebhookDelivery`)**:
  ```json
  {
    "event": "booking.created",
    "createdAt": "2026-05-16T12:05:00Z",
    "data": {
      "bookingId": "bk_789",
      "status": "confirmed"
    }
  }
  ```

### 4.6 Onboarding & Provisioning
`POST /v1/admin/invites` (Layer 2)
- Creates JWT token containing quota allocations.
`POST /v1/auth/provision` (Layer 3 Onboarding)
- **Request Schema**:
  ```json
  {
    "inviteToken": "jwt_string...",
    "businessName": "Acme Corp",
    "email": "owner@acme.com",
    "password": "SecurePassword123!",
    "timezone": "America/New_York",
    "services": [{ "name": "Consulting", "duration": 60 }]
  }
  ```

---

## 5. Superadmin and Analytics Schemas
`GET /v1/admin/usage`
- Aggregates limits across all tenants.
- **Response Data Form**:
  ```json
  {
    "activeTenants": 142,
    "totalVolume":{
       "aiMessages": 450201,
       "bookings": 1205
    },
    "alerts": [
       {"tenantId": "client_12", "issue": "Storage quota 99%"}
    ]
  }
  ```
