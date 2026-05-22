# Quick Start Verification Guide

## One-Minute Health Check

```bash
# 1. Check server starts without errors
npm run dev

# 2. Test health endpoint (should return {"status":"ok"})
curl http://localhost:3000/health-check

# 3. Test public config endpoint (requires platform-prime client in DB)
curl "http://localhost:3000/v1/public/headless/config?host=localhost"
```

## Multi-Tenant Isolation Test

### Test 1: ClientId Validation
```bash
# Should succeed - provides valid clientId
curl -H "x-client-id: client-one" http://localhost:3000/v1/booking

# Should fail with 401 - no clientId provided
curl http://localhost:3000/v1/booking

# Should fail with 401 - invalid clientId (not in database)
curl -H "x-client-id: fake-client" http://localhost:3000/v1/booking
```

### Test 2: Data Isolation
```bash
# Create test clients in MongoDB first:
# db.clients.insertOne({ clientId: "test-client-1", businessName: "Business 1" })
# db.clients.insertOne({ clientId: "test-client-2", businessName: "Business 2" })

# Create bookings for each client:
# POST /v1/booking with clientId: "test-client-1"
# POST /v1/booking with clientId: "test-client-2"

# Client 1 should only see their bookings:
curl -H "x-client-id: test-client-1" http://localhost:3000/v1/booking
# Response should only show bookings with clientId="test-client-1"

# Client 2 should only see their bookings:
curl -H "x-client-id: test-client-2" http://localhost:3000/v1/booking
# Response should only show bookings with clientId="test-client-2"
```

### Test 3: AI Data Validation
```bash
# Setup: Create a client with services in Settings
# db.settings.insertOne({
#   clientId: "test-ai-client",
#   businessName: "AI Test Business",
#   services: [{ name: "Service 1", price: 100 }]
# })

# AI form generation should succeed
curl -X POST http://localhost:3000/v1/dashboard/ai/generate-form \
  -H "x-client-id: test-ai-client" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"create a contact form"}'

# Form generation should fail for non-existent client
curl -X POST http://localhost:3000/v1/dashboard/ai/generate-form \
  -H "x-client-id: fake-client" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"create a contact form"}'
# Should return: "Client business information not found in database"
```

## Key Code Locations

### Tenant Validation
- **Location**: `src/api/middlewares/tenantContext.ts`
- **Purpose**: Validates clientId on all protected routes
- **Check**: Ensures clientId exists and is not empty

### ClientId Resolution
- **Location**: `src/api/utils/resolveClient.ts`
- **Purpose**: Determines clientId from request signals
- **Priority Order**:
  1. API Key validation
  2. Direct clientId with database check
  3. Domain mapping
  4. Platform domain default
  5. Fail if none found

### AI Data Validation
- **Location**: `src/api/utils/aiDataLoaders.ts`
- **Functions**:
  - `loadClientSettings()` - Load business info
  - `getClientServices()` - Get service list
  - `getClientBranding()` - Get brand colors
  - `checkAvailabilityForAI()` - Check booking slots

### Multi-Tenant Chat
- **Location**: `src/api/routes/chat.ts` (lines 200-240)
- **Key**: System prompt includes clientId isolation warning
- **Enforcement**: All tool calls filtered by clientId

## Response Format

All API responses use consistent envelope format:

### Success Response (200)
```json
{
  "success": true,
  "request_id": "req_abc123",
  "timestamp": "2026-05-22T20:30:00.000Z",
  "data": { /* actual data */ },
  "meta": {
    "version": "v1",
    "clientId": "test-client-1"
  }
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "request_id": "req_abc123",
  "timestamp": "2026-05-22T20:30:00.000Z",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "clientId is missing",
    "details": {},
    "retryable": false
  }
}
```

## Debugging Tips

### Check clientId Resolution
```bash
# Look for [RESOLVE] logs in console:
# [RESOLVE] Resolved via API Key: client-one
# [RESOLVE] Direct ID resolved to clientId: client-two
# [RESOLVE] Domain mapping resolved to clientId: client-three

npm run dev 2>&1 | grep RESOLVE
```

### Check Tenant Isolation
```bash
# Look for [TENANT] logs in console:
# [TENANT] Validating clientId: client-one from request

npm run dev 2>&1 | grep TENANT
```

### Check AI Data Loading
```bash
# Look for [DATA-LOADER] logs in console:
# [DATA-LOADER] Error loading client settings: ...

npm run dev 2>&1 | grep DATA-LOADER
```

## Common Issues & Solutions

### Issue: "clientId is missing" on protected route
**Solution**: Provide clientId via:
- Header: `x-client-id: your-client-id`
- Query: `?clientId=your-client-id`
- Body: `{ "clientId": "your-client-id" }`

### Issue: "Target client could not be identified"
**Solution**: Ensure clientId is in database:
```javascript
db.clients.findOne({ clientId: "your-id" })
```

### Issue: AI returns "Client business information not found"
**Solution**: Create Settings document:
```javascript
db.settings.insertOne({
  clientId: "your-id",
  businessName: "Your Business",
  services: [{ name: "Service 1" }]
})
```

### Issue: Server exits on startup
**Solution**: Check MongoDB connection:
```bash
# Verify MONGODB_URI is set:
echo $MONGODB_URI

# Test connection:
mongosh $MONGODB_URI
```

## Rollback Instructions

If critical issues arise, all changes are isolated to:
1. `server.ts` - MongoDB validation, middleware registration
2. `src/api/middlewares/tenantContext.ts` - NEW file
3. `src/api/utils/resolveClient.ts` - Enhanced validation
4. `src/api/utils/aiDataLoaders.ts` - NEW file
5. `src/api/utils/validateEnv.ts` - NEW file
6. `src/api/routes/ai.ts` - Data validation added
7. `src/app.tsx` - Catch-all route added
8. `src/lib/useClientId.ts` - Enhanced logic

These can be rolled back individually without affecting other functionality.
