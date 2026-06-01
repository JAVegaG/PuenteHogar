---
inclusion: fileMatch
fileMatchPattern: "src/frontend/**"
description: Frontend component patterns including typography tokens, layout conventions, and shared component usage.
---

# Frontend Component Patterns

## Typography — CRITICAL
- NEVER use Tailwind default text sizes (`text-sm`, `text-lg`, `text-xl`, etc.)
- The project uses `font-size: 62.5%` on `<html>` (1rem = 10px), so default Tailwind sizes resolve to wrong pixel values
- Use design system tokens: `text-h1` (32px), `text-h2` (24px), `text-h3` (20px), `text-body` (16px), `text-caption` (14px), `text-small` (12px)
- Form labels: `text-caption font-medium`
- Section headings: `text-h3 font-semibold`

### Typography Hierarchy — Avoid Same-Weight Collisions
- Each page must have a clear visual hierarchy. Do NOT use the same size+weight for both a section heading and a value inside that section.
- Recommended hierarchy within a detail/card page:
  - Page title (in Header): handled by the Header component
  - Primary values (amounts, totals): `text-h2 font-bold`
  - Section headings: `text-h3 font-semibold`
  - Card titles / list item titles: `text-h3 font-semibold` (OK — they are visually separated by card boundaries)
  - Body text / descriptions: `text-body`
  - Metadata / secondary info: `text-caption`
- If a section heading and a value inside it would both be `text-h3`, promote the value to `text-h2` to create contrast

## Primary Button Style
All main CTAs use:
```
bg-[#1d4ed8] text-white rounded-[6px] min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center font-semibold
```
Or use the shared `<Button variant="primary">` component from `@/shared/components/Button`.

## Card Styling
Card sections use: `border border-neutral-200 rounded-card bg-white p-4`

## Back Button
- Use `<Link>` from `next/link` (not `<button>` with `router.push()`)
- Use `rounded-card` class
- Use left-arrow SVG: `<line x1="19" y1="12" x2="5" y2="12" />` + `<polyline points="12 19 5 12 12 5" />`
- NOT the chevron (`<polyline points="15 18 9 12 15 6" />`)

## StatusBadge
Import from `@/shared/components/StatusBadge`. Variants: `lease`, `unit`, `payment`, `listing`, `contract`, `tracking`, `paymentStatus`, `notification`.

**Variant selection guide** — choose based on what the backend returns:
- `tracking` → raw tracking states from backend (`PUBLISHED`, `CONTRACT_UPLOADED`, `PAYMENT_RECEIVED`, etc.)
- `paymentStatus` → raw payment statuses (`PENDING`, `PAID`, `OVERDUE`, `REJECTED`)
- `contract` → raw contract statuses (`PENDING`, `SIGNATURE_PENDING`, `SIGNED`)
- `lease` → already-translated lease display labels (`Vigente`, `Acordado`, `Finalizado`)
- `unit` → already-translated unit labels (`Ocupado`, `Disponible`, `Mantenimiento`)
- `listing` → already-translated listing labels (`Publicada`, `Sin publicar`)
- `notification` → raw notification statuses (`SENT`, `FAILED`, `PENDING`)

## Status Labels & Centralized Mappers — CRITICAL
- NEVER display raw English enum values (e.g., `CONTRACT_UPLOADED`, `OVERDUE`) to users
- All status-to-label translations live in `@/shared/utils/statusMaps.ts`
- Use the centralized helpers when you need a translated label outside of `StatusBadge`:
  - `translateTrackingStatus(status)` — e.g., `'CONTRACT_UPLOADED'` → `'Contrato cargado'`
  - `translatePaymentStatus(status)` — e.g., `'OVERDUE'` → `'Vencido'`
  - `translateContractStatus(status)` — e.g., `'SIGNATURE_PENDING'` → `'Firma pendiente'`
  - `translateRole(role)` — e.g., `'LANDLORD'` → `'Arrendador'`
- Do NOT define inline `translateRole` or status mapping functions in components — import from `@/shared/utils/statusMaps`
- When adding a new status value, update BOTH `statusMaps.ts` AND the corresponding color map in `StatusBadge.tsx`

## ConfirmationDialog
Import from `@/shared/components/ConfirmationDialog`. Props: `isOpen`, `title`, `message`, `confirmLabel`, `cancelLabel?`, `onConfirm`, `onCancel`, `isLoading?`.

## Page Layout
- Form/detail pages: wrap `<main>` content in `max-w-[560px]` centered container
- `/explorar` is exempt — uses full-width grid
- All pages use `px-mobile-margin md:px-desktop-margin`

## Navigation
- First-level pages: hamburger menu via `SideMenu` (lazy-loaded)
- Sub-level pages: back arrow via `Header`'s `leftAction`
- Auth pages are first-level (hamburger, not back button)

## Currency
- All currency is COP for MVP
- Use `formatCOP`/`stripCOP` helpers for display formatting
- `leaseBaseCurrency: 'COP'` is hardcoded in payloads
