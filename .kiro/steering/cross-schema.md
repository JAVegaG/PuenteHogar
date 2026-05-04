---
inclusion: fileMatch
fileMatchPattern: "src/backend/modules/**"
---

# Cross-Schema Patterns

## User Name Resolution
When displaying user information outside the `users` schema (e.g., tenant names in contracts, landlord names in leases), resolve names via cross-schema lookup:

```typescript
// Pattern: resolve user ID to human-readable name
const natural = await this.prisma.naturalPersonDetail.findUnique({
  where: { user_id: userId },
});
if (natural) return `${natural.first_name} ${natural.last_name}`;

const legal = await this.prisma.legalPersonDetail.findUnique({
  where: { user_id: userId },
});
if (legal) return legal.business_name;

return null; // fallback — never show raw UUIDs to users
```

NEVER display raw user IDs (UUIDs) in the frontend. Always resolve to a name.

## PII Decryption
Any module reading PII cross-schema (`document_number`, `phone_number`) must:
1. Inject `IPIIEncryptor` via `@Inject(PII_ENCRYPTOR)`
2. Call `piiEncryptor.decrypt()` before returning to frontend
3. Register `{ provide: PII_ENCRYPTOR, useClass: AES256PIIEncryptor }` in module providers
4. Import `ConfigModule` for the encryption key

## Cross-Schema References
- References between schemas are plain `String` fields — no Prisma `@relation`
- Use multi-step queries: e.g., `Lease → PortfolioUnit → LandlordPortfolio` to resolve ownership
- NEVER use raw SQL joins across PostgreSQL schemas
- NEVER import another module's repository directly

## Notification Ports
- Each module uses a local `INotificationPort` stub
- Notifications are fire-and-forget: `this.notificationPort.notify(...).catch(() => undefined)`
- No `await`, no throw on failure
