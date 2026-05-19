# Security Specification - Lead Intelligence & Funnel Architecture

## Data Invariants
1. A Form must be owned by a valid Client.
2. A Lead must reference a valid source (Form, Booking, or Contact).
3. Access to Leads and Forms is strictly scoped by `clientId`.
4. Users can only read/write data belonging to their own `clientId`.

## The Dirty Dozen Payloads (Targeting Firestore Rules)

1. **Identity Spoofing**: Attempt to create a Form with a `clientId` that doesn't match the authenticated user's ID.
2. **PII Leak**: Attempt to list all Leads across the entire platform without filtering by `clientId`.
3. **Privilege Escalation**: Attempt to update a Lead's `stage` to "Closed Won" as an unauthenticated user.
4. **ID Poisoning**: Use a 2KB string as a `formId` to cause resource exhaustion.
5. **State Shortcut**: Update a Booking status from "cancelled" back to "pending" (terminal state violation).
6. **Shadow Update**: Inject an `isPlatformAdmin: true` field into a Lead object.
7. **Orphaned Lead**: Create a Lead referencing a non-existent `formId`.
8. **Bulk Scrape**: Query for all Forms where `status == 'active'` without a `clientId` filter.
9. **Timestamp Manipulation**: Manually set `createdAt` to a date in the past during Lead submission.
10. **Data Type Poisoning**: Set `score` (expected number) to a massive string payload.
11. **Client ID Masquerading**: Submit a Form payload with a modified `clientId` in the middle of a session.
12. **Anonymous Write**: Attempt to delete a Form without any `Authorization` header.

## Test Runner Plan
- Verification of these payloads will be handled via `firestore-rules-validator` once the initial rules are drafted.
- Emphasis on `affectedKeys().hasOnly()` for update operations to prevent field injection.
