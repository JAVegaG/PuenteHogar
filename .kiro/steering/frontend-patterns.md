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
Import from `@/shared/components/StatusBadge`. Variants: `lease`, `unit`, `payment`, `listing`, `contract`.

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
