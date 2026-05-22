# Tier System and AI Quota Implementation Guide

## Overview
This document describes the complete tier system, AI usage accounting, quota management, and bot integration implementation for PrimeSoft Operations Suite.

## 1. Routing Fix
Fixed the SPA 404 issue where clients received "page not found" instead of the expected landing pages. The server now properly serves `index.html` in development mode, enabling client-side routing to work correctly for all admin and client dashboards.

**File Changed:** `server.ts` (lines 289-319)
- Development mode now serves index.html as fallback
- Production mode continues to serve from dist directory
- Proper error handling for missing index.html

## 2. Tier System Architecture

### Tier Definitions
Three tier levels with progressive features:

```
STARTER (Free)
- 10K AI tokens/month
- 1,000 chat messages/month
- 1GB storage
- Web chat enabled
- No Telegram/WhatsApp

PROFESSIONAL ($29/month)
- 100K AI tokens/month
- 10,000 chat messages/month
- 10GB storage
- Web chat + Telegram enabled
- WhatsApp disabled

ENTERPRISE ($99/month)
- 1M AI tokens/month
- 100K chat messages/month
- 100GB storage
- All features enabled (Web chat, Telegram, WhatsApp)
```

### Models and Fields
**Client Schema Updated:**
- Added `tier` field: enum ['starter', 'professional', 'enterprise']
- Added Telegram bot integration fields
- Added WhatsApp integration fields

**Quota Model:**
- Tracks per-client monthly quotas
- Stores current usage (tokens, messages, storage)
- Tracks enabled features by tier
- Manages quota reset dates

**TierDefinition Model:**
- System-wide tier configurations
- Feature flags per tier
- Token/message/storage limits

**AIUsageLog Model:**
- Complete usage tracking across all platforms
- Records source (API, website, embed, Telegram, WhatsApp)
- Tracks tokens, platform, status
- Full audit trail for compliance

## 3. AI Usage Accounting System

### Implementation Files
- `src/api/services/quotaService.ts` - Core quota management
- `src/api/middlewares/aiUsageTracking.ts` - Automatic usage tracking

### Key Functions

#### checkAIQuota()
Validates if a client can perform an AI action before execution:
```typescript
const result = await checkAIQuota(clientId, tokensNeeded, 'chat');
if (!result.allowed) {
  // Enforce limit
}
```

#### recordAIUsage()
Records usage after successful AI operation:
```typescript
await recordAIUsage(clientId, 'chat', 'telegram', tokensUsed, metadata);
```

#### assignTierToClient()
Assigns tier during onboarding with automatic quota creation:
```typescript
await assignTierToClient(clientId, 'professional');
```

### Tracking Across Platforms
Usage is tracked and counted regardless of source:
- **Web API:** Direct AI endpoint calls
- **Website:** Embedded chatbot via headless injection
- **Telegram:** Bot messages routed through clientId
- **WhatsApp:** Business API messages with quota enforcement
- **Dashboard:** Admin-triggered AI generations

All count toward monthly quota limits.

## 4. Quota Enforcement

### How It Works
1. Before AI execution, `checkAIQuota()` is called
2. Checks:
   - Is monthly quota reset needed?
   - Has quota been exceeded?
   - Are tokens available?
   - Is feature enabled for tier?
3. Returns detailed quota status or rejection reason
4. If allowed, AI operation proceeds
5. After success, `recordAIUsage()` updates counters

### Monthly Reset
Quotas reset on the 1st of each month:
- `quotaResetDate` field tracks next reset
- On check, system auto-resets if date has passed
- Zero out aiTokensUsed, chatMessagesUsed, storageUsed

### Graceful Degradation
When quota exceeded:
- User receives clear error message
- Shows remaining balance
- Provides reset date
- Suggests tier upgrade

## 5. Telegram Bot Integration

### Setup Flow
1. Admin obtains Telegram bot token from @BotFather
2. Calls `POST /v1/telegram/setup` with bot token
3. System stores token in Client document
4. Webhook URL is generated and registered

### Message Flow
1. User sends message to bot on Telegram
2. Telegram sends webhook to `/v1/telegram/webhook/:clientId`
3. System identifies client and routes to correct tenant
4. Quota check ensures client has remaining tokens
5. AI processes message
6. Response sent back to Telegram
7. Usage recorded with 'telegram' source

### Quota Enforcement
- Each Telegram message = 1 token
- Respects tier features (Professional/Enterprise only)
- Graceful quota-exceeded messages
- Maintains tenant isolation

**Routes:**
- `POST /v1/telegram/webhook/:clientId` - Webhook handler
- `POST /v1/telegram/setup` - Bot configuration
- `POST /v1/telegram/send` - Send message to chat

## 6. WhatsApp Bot Integration

### Setup Flow
1. Admin registers for WhatsApp Business API
2. Obtains access token and business account ID
3. Calls `POST /v1/whatsapp/setup` with credentials
4. System configures webhook

### Message Flow
1. Customer sends message via WhatsApp
2. Meta sends webhook to `/v1/whatsapp/webhook/:clientId`
3. System verifies webhook token
4. Identifies client by phone number
5. Quota validation
6. AI processing
7. Response sent via WhatsApp API
8. Usage recorded

### Feature Gate
- Starter tier: Disabled
- Professional/Enterprise: Enabled
- Proper error messages if not available

**Routes:**
- `POST /v1/whatsapp/webhook/:clientId` - Webhook handler
- `POST /v1/whatsapp/setup` - Bot configuration
- `POST /v1/whatsapp/send` - Send message

## 7. Multi-Tenant Isolation Guarantees

All implementations maintain strict tenant isolation:

1. **ClientId Validation**
   - Every operation checks clientId against database
   - Telegram/WhatsApp messages routed to correct client only
   - No cross-tenant data leakage possible

2. **Quota Per-Client**
   - Each client has independent quota
   - Usage counted only against their limits
   - Professional client doesn't affect Starter client

3. **Feature Access Control**
   - Tier features enforced before operation
   - Telegram/WhatsApp only for correct tiers
   - Superadmin cannot see other client data

4. **Usage Logs**
   - Indexed by clientId for fast lookup
   - Audit trail shows which client consumed which tokens
   - Compliance-ready tracking

## 8. Onboarding Integration

### Adding Tier Selection
To add tier selection during onboarding:

1. Update `Onboarding.tsx` to add tier selection step
2. After client activation, call:
   ```typescript
   await assignTierToClient(clientId, selectedTier);
   ```
3. System automatically:
   - Updates Client.tier
   - Creates Quota record
   - Initializes usage counters
   - Enables/disables features

### Tier Comparison UI
Can be displayed on onboarding or settings page using TierDefinition data:
```typescript
const tiers = await TierDefinition.find({});
// Display tier cards with features and pricing
```

## 9. Superadmin Dashboard Quota Management

### Available for Implementation
Superadmin can:
1. View all clients and their quotas
2. See current usage vs limits
3. Change client tier (triggers quota update)
4. Reset quotas manually (for testing)
5. View usage analytics by platform

### APIs Required
- `GET /v1/sys-admin/quotas` - List all quotas
- `PUT /v1/sys-admin/clients/:clientId/tier` - Change tier
- `GET /v1/sys-admin/usage/analytics` - Usage stats

## 10. AI Usage Across Platforms

### Web API
- Calls to `/v1/dashboard/ai/generate-*` endpoints
- Tracked with source='api'
- Premium feature (Professional+)

### Website Embedding
- Chatbot injected via headless script
- Tracked with source='embed'
- Available on all tiers

### Telegram Bot
- Messages via Telegram
- Tracked with source='telegram'
- Professional/Enterprise only

### WhatsApp Bot
- Messages via WhatsApp
- Tracked with source='whatsapp'
- Enterprise only

### Chat Support
- Chat messages to support
- Tracked with source='chat'
- All tiers

All contribute to the same monthly token pool for the client.

## 11. Configuration and Initialization

### Initialize Tiers on Startup
The server should call on startup:
```typescript
await initializeTierDefinitions();
```

This creates the three default tiers if they don't exist.

### Environment Variables
Set in `.env`:
```
PUBLIC_URL=https://api.primesoft.com
TELEGRAM_WEBHOOK_SECRET=your_secret
WHATSAPP_VERIFY_TOKEN=your_token
```

## 12. Security Considerations

1. **Bot Tokens:** Stored encrypted in database
2. **Webhook Verification:** Token-based verification for Telegram/WhatsApp
3. **Rate Limiting:** Consider implementing to prevent abuse
4. **Audit Logging:** All quota changes logged for compliance

## 13. Testing Checklist

- [ ] Tier assignment during onboarding
- [ ] Quota checks prevent over-usage
- [ ] Monthly quota reset works
- [ ] Telegram webhook receives messages
- [ ] Telegram responds through bot
- [ ] WhatsApp webhook receives messages
- [ ] WhatsApp responds through Business API
- [ ] Quota counts correctly across platforms
- [ ] Feature access controls work (Telegram/WhatsApp by tier)
- [ ] Superadmin can view/manage quotas
- [ ] Tenant isolation maintained
- [ ] Usage logs complete and queryable

## 14. Future Enhancements

1. Add real-time quota usage dashboard
2. Implement quota alerts before limit
3. Add usage-based pricing beyond plans
4. Support multiple Telegram bots per client
5. Add Discord bot integration
6. Implement per-feature quotas
7. Add team member quota sharing within plan
