# PrimeSoft UI/UX Implementation - Developer Reference

Quick reference guide for developers working with the new UI components and APIs.

## Component Quick Reference

### ClickableCard
```tsx
import { ClickableCard } from '@/components/ClickableCard';

<ClickableCard
  title="Title"
  description="Optional description"
  icon={<IconComponent />}
  count={123}
  badge="Label"
  status="active" // active | pending | error | inactive
  onClick={() => {}}
/>
```

### Modal & useModal Hook
```tsx
import { Modal, useModal } from '@/components/ModalManager';

const modal = useModal();

<Modal
  isOpen={modal.isOpen}
  onClose={modal.close}
  title="Modal Title"
  size="md" // sm | md | lg | xl
  footer={<FooterActions />}
>
  Content here
</Modal>

// Trigger
<button onClick={() => modal.open(data)}>Open</button>
```

### NotificationBell
```tsx
import { NotificationBell, Notification } from '@/components/NotificationBell';

const [notifications, setNotifications] = useState<Notification[]>([]);

<NotificationBell
  notifications={notifications}
  onNotificationRead={(id) => {}}
  onNotificationDismiss={(id) => {}}
/>

// Create notification
{
  id: '1',
  type: 'success', // success | error | warning | info
  title: 'Title',
  message: 'Message',
  timestamp: new Date(),
  read: false,
  action: { label: 'Action', onClick: () => {} }
}
```

### EmbedScriptGenerator
```tsx
import { EmbedScriptGenerator } from '@/components/EmbedScriptGenerator';

<EmbedScriptGenerator
  clientId="client-123"
  apiKey="key-xyz"
  baseUrl="https://app.example.com"
/>
```

### FormBuilder
```tsx
import { FormBuilder, FormTemplate } from '@/components/FormBuilder';

<FormBuilder
  template={optionalExistingTemplate}
  onSave={async (template) => {
    // Save to API
  }}
  isLoading={false}
/>
```

## API Routes Reference

### Base URL: `/v1/embed`

#### 1. Submit Form
```
POST /v1/embed/forms/submit
Headers: X-Client-Id (or X-API-Key)

Request:
{
  "formId": "form-1",
  "formName": "Contact Form",
  "formData": {
    "name": "John",
    "email": "john@example.com",
    "phone": "+1234567890",
    "message": "Hello"
  }
}

Response:
{
  "success": true,
  "data": {
    "id": "contact-id",
    "message": "Form submitted successfully"
  }
}
```

#### 2. Create Booking
```
POST /v1/embed/booking/submit
Headers: X-Client-Id

Request:
{
  "clientDateTime": "2026-05-25T14:00:00Z",
  "serviceId": "service-1",
  "serviceName": "Consultation",
  "guestInfo": {
    "name": "Jane",
    "email": "jane@example.com",
    "phone": "+1234567890"
  }
}

Response:
{
  "success": true,
  "data": {
    "id": "booking-id",
    "confirmation": true
  }
}
```

#### 3. Get Services
```
GET /v1/embed/services
Headers: X-Client-Id

Response:
{
  "success": true,
  "data": [
    {
      "id": "service-1",
      "name": "Consultation",
      "description": "30-minute consultation",
      "duration": 30,
      "price": 99.99
    }
  ]
}
```

#### 4. Get Client Config
```
GET /v1/embed/config
Headers: X-Client-Id

Response:
{
  "success": true,
  "data": {
    "clientId": "client-123",
    "businessName": "My Business",
    "email": "info@example.com",
    "logo": "https://...",
    "primaryColor": "#3b82f6",
    "secondaryColor": "#1e293b",
    "brandText": "Powered by PrimeSoft",
    "enabledFeatures": {
      "chatbot": true,
      "forms": true,
      "booking": true,
      "services": true
    }
  }
}
```

#### 5. Send Chat Message
```
POST /v1/embed/chat/message
Headers: X-Client-Id

Request:
{
  "sessionId": "session-123",
  "message": "Hello, how can you help?",
  "context": {
    "page": "homepage",
    "referrer": "google"
  }
}

Response:
{
  "success": true,
  "data": {
    "id": "msg-id",
    "sessionId": "session-123",
    "role": "assistant",
    "content": "Response message",
    "timestamp": "2026-05-22T10:00:00Z"
  }
}
```

#### 6. Track Analytics Event
```
POST /v1/embed/analytics/event
Headers: X-Client-Id

Request:
{
  "eventType": "form_viewed",
  "eventData": {
    "formId": "form-1",
    "timestamp": "2026-05-22T10:00:00Z"
  }
}

Response:
{
  "success": true,
  "data": { "recorded": true }
}
```

## Hooks Reference

### useClientId
```tsx
import { useClientId } from '@/lib/useClientId';

const { clientId } = useClientId();
// Use clientId for API calls
```

### useModal
```tsx
import { useModal } from '@/components/ModalManager';

const modal = useModal();
modal.open(data);
modal.close();
// modal.isOpen, modal.data available
```

## Common Patterns

### Handling Form Submission with Modal Confirmation
```tsx
const confirmModal = useModal();
const [formData, setFormData] = useState({});

const handleSubmit = async () => {
  confirmModal.open(formData);
};

const handleConfirm = async () => {
  const res = await fetch('/v1/embed/forms/submit', {
    method: 'POST',
    body: JSON.stringify(confirmModal.data)
  });
  confirmModal.close();
};
```

### Creating Notifications
```tsx
const addNotification = (title: string, message: string, type: Notification['type']) => {
  setNotifications(prev => [...prev, {
    id: Date.now().toString(),
    type,
    title,
    message,
    timestamp: new Date(),
    read: false
  }]);
};
```

### Card Grid with Modal
```tsx
const [selectedCard, setSelectedCard] = useState(null);

<div className="grid grid-cols-3 gap-4">
  {items.map(item => (
    <ClickableCard
      key={item.id}
      title={item.name}
      count={item.count}
      onClick={() => setSelectedCard(item)}
    />
  ))}
</div>

<Modal
  isOpen={!!selectedCard}
  onClose={() => setSelectedCard(null)}
  title={selectedCard?.name}
>
  {/* Modal content */}
</Modal>
```

## Tenant Isolation Best Practices

### Getting ClientId
```tsx
// In client components
import { useClientId } from '@/lib/useClientId';
const { clientId } = useClientId();

// In server routes
import { resolveClientId } from './utils/resolveClient';
const clientId = await resolveClientId(req);
```

### Filtering by ClientId
```tsx
// Always filter by clientId in API responses
const contacts = await Contact.find({ clientId });

// Include clientId in all database writes
await Contact.create({ clientId, name: 'John' });
```

### API Headers
```tsx
// Always include X-Client-Id in requests
const res = await fetch('/v1/embed/config', {
  headers: {
    'X-Client-Id': clientId
  }
});
```

## Styling Classes

### Colors
- Primary: `text-blue-400`, `bg-blue-600`, `border-blue-500`
- Hover: `hover:bg-blue-700`, `hover:text-blue-300`
- Status Active: `text-emerald-400`, `bg-emerald-500/20`
- Status Pending: `text-amber-400`, `bg-amber-500/20`
- Status Error: `text-red-400`, `bg-red-500/20`
- Background: `bg-slate-900`, `bg-slate-800`
- Text: `text-slate-100`, `text-slate-300`, `text-slate-400`

### Common Patterns
```tsx
// Card wrapper
className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6"

// Button primary
className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"

// Button secondary
className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"

// Input field
className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded text-slate-100 focus:outline-none focus:border-blue-500/50"

// Modal header
className="flex items-center justify-between p-6 border-b border-slate-700/50"
```

## Common Tasks

### Add a New Embed Type
1. Create script template in `EmbedScriptGenerator.tsx`
2. Add POST endpoint in `/v1/embed/new-type`
3. Add route in `embed.ts`
4. Register in `server.ts`
5. Add UI in `HeadlessManager.tsx`

### Add a New Notification Type
1. Update `Notification` type in `NotificationBell.tsx`
2. Add color case in `getBgColor()` function
3. Add icon case in `getIcon()` function
4. Update type options in UI

### Add a New Form Field Type
1. Add type to `FormField['type']`
2. Add to `FIELD_TYPES` array in `FormBuilder`
3. Add case in `renderFieldPreview()`
4. Add validation if needed

## Error Handling

### API Error Response
```tsx
const res = await fetch('/v1/embed/forms/submit', {
  method: 'POST',
  body: JSON.stringify(data)
});

if (!res.ok) {
  const error = await res.json();
  console.error(error.error.message);
  // Show to user
}
```

### Component Error Boundaries
Wrap pages in error boundary:
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <YourPage />
</ErrorBoundary>
```

## Performance Tips

1. **Lazy load modals** - Only render when isOpen
2. **Memoize callbacks** - Use useCallback for onClick handlers
3. **Debounce API calls** - Use debounce for form inputs
4. **Virtual scrolling** - For long notification lists
5. **Image optimization** - Use next/image or similar

## Debugging

### Enable verbose logging
```tsx
// In components
console.log('[v0] ComponentName:', data);

// In API routes
console.log('[EMBED] Endpoint:', { clientId, data });
```

### Check tenant isolation
```tsx
// Make sure clientId is present in all requests
console.log('ClientId:', clientId); // Should not be undefined
```

### Verify routes
```bash
# Check server startup
grep -n "app.use('/v1/embed'" server.ts

# Check imports
grep -n "embedRoutes" server.ts
```

## Resources

- UI Components: `src/components/`
- Pages: `src/pages/superadmin/AdminHub.tsx`, `src/pages/dashboard/HeadlessManager.tsx`
- API: `src/api/routes/embed.ts`
- Full Guide: `UI_UX_IMPLEMENTATION_GUIDE.md`
- Summary: `IMPLEMENTATION_SUMMARY.md`

## Support

For issues or questions about the new UI/UX components, refer to:
1. Inline component documentation
2. `UI_UX_IMPLEMENTATION_GUIDE.md`
3. `IMPLEMENTATION_SUMMARY.md`
4. This reference guide
