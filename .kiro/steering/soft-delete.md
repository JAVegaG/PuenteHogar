---
inclusion: fileMatch
fileMatchPattern: "src/backend/**"
description: Enforces soft-delete query patterns. Every read query must filter by deleted_at null using shared utilities.
---

# Soft Delete Rules

Every query that reads active records MUST include `deleted_at: null` in the WHERE clause. This applies to:

## Prisma Queries
- `findMany`, `findFirst`, `findUnique`, `count` — always add `deleted_at: null` to the `where` clause
- Use `softDeleteFilter` from `@src/shared/prisma/soft-delete.utils` when available
- Use `softDeleteData()` for soft-delete operations (sets `deleted_at: new Date()`)

## Common Mistakes to Avoid
- Counting active leases without filtering `deleted_at` (causes wrong "Arriendos activos" count)
- Listing contracts without filtering `deleted_at` (shows cancelled contracts as active)
- Deriving unit status from leases without filtering `deleted_at` (shows "Ocupado" for cancelled leases)
- Cross-schema lookups that don't filter `deleted_at` on the source table

## Exceptions
- RAW tables (`UsersRaw`, `PortfolioRaw`, etc.) do NOT have `deleted_at` — they use the `processed` flag
- When you explicitly need to include soft-deleted records (e.g., audit history), pass `deleted_at: { not: null }` or omit the filter intentionally with a code comment explaining why

## Pattern
```typescript
// ✅ Correct
const leases = await prisma.lease.findMany({
  where: { portfolio_unit_id: unitId, deleted_at: null },
});

// ✅ Correct — using utility
import { softDeleteFilter } from '@src/shared/prisma/soft-delete.utils';
const features = await prisma.additionalFeature.findMany({
  where: { active: true, ...softDeleteFilter },
});

// ❌ Wrong — missing deleted_at filter
const leases = await prisma.lease.findMany({
  where: { portfolio_unit_id: unitId },
});
```
