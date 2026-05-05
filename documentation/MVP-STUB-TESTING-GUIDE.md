# MVP Stub Testing Guide

## Overview

The MVP uses **stub adapters** for external integrations that will be replaced with real provider implementations post-MVP. These stubs simulate the behavior of:

- **E-Signature Provider** — electronic contract signing (Ley 527 de 1999 compliance)
- **Payment Gateway** — PSE / debit / credit card processing
- **Messaging Channel** — WhatsApp and email notifications

Because stubs return mock responses immediately (without real external processing), some flows require **manual webhook calls** to advance the application state. This guide documents exactly what manual steps are needed and provides ready-to-use curl commands.

> **Important**: The backend runs on `http://localhost:3001` by default. Adjust the port if your `.env` configuration differs.

---

## Stubs Reference

| Stub | Adapter File | Behavior | Manual Intervention Required |
|------|-------------|----------|------------------------------|
| `ESignatureProviderAdapter` | `src/backend/modules/contracts/infrastructure/adapters/e-signature-provider.adapter.ts` | Returns a mock signing ID (e.g., `mock-signing-<contractId>-<timestamp>`) with status `INITIATED` | **Yes** — must call signing webhook to complete |
| `PaymentGatewayAdapter` | `src/backend/modules/payments/infrastructure/adapters/payment-gateway.adapter.ts` | Returns `APPROVED` with a mock redirect URL (e.g., `https://mock-pse.example.com/pay?key=<idempotencyKey>`) | **Yes** — must call payment webhook to confirm |
| `MessagingChannelAdapter` | `src/backend/modules/notifications/infrastructure/adapters/messaging-channel.adapter.ts` | Logs notification details to the NestJS console (channel, userId, event, data) | **No** — verify by checking server logs |

---

## E-Signature Flow

The e-signature flow moves a contract from `PENDING` → `SIGNATURE_PENDING` → `SIGNED`.

### Step-by-Step

1. **Create a contract** (as landlord):
   - Via UI: navigate to `/mis-contratos`, select a lease, upload a PDF
   - Via API: `POST /contracts` with multipart form data (file + `CreateContractDto`)
   - Contract is created with status `PENDING`

2. **Initiate signing**:
   - Via UI: open the contract detail and click "Iniciar firma"
   - Via API: `POST /contracts/:contractId/sign` (requires JWT auth as landlord or tenant party)
   - The `ESignatureProviderAdapter` returns a mock signing ID
   - Contract moves to `SIGNATURE_PENDING`

3. **Simulate signing completion** (manual webhook call):

   The external e-signature provider would normally call this endpoint when signing is complete. Since we use a stub, you must call it manually:

   ```bash
   curl -X POST http://localhost:3001/contracts/webhook/signing \
     -H "Content-Type: application/json" \
     -d '{
       "contractId": "<CONTRACT_ID>",
       "externalSigningId": "mock-signing-id",
       "status": "COMPLETED",
       "completedAt": "2026-01-15T10:00:00.000Z"
     }'
   ```

   **Payload fields** (`SigningWebhookDto`):

   | Field | Type | Required | Description |
   |-------|------|----------|-------------|
   | `contractId` | string | Yes | The contract UUID from the platform |
   | `externalSigningId` | string | Yes | The signing session ID (use any mock value) |
   | `status` | `"COMPLETED"` \| `"FAILED"` | Yes | Result of the signing process |
   | `documentHash` | string | No | Hash of the signed document (optional) |
   | `completedAt` | ISO 8601 string | No | Timestamp of completion |

4. **Result** (when `status: "COMPLETED"`):
   - Contract status updates to `SIGNED`
   - Notifications are sent to both landlord and tenant (fire-and-forget, visible in server logs)
   - Audit log entry recorded with action `CONTRACT_SIGNED`
   - **Scheduled payment is automatically created** for the lease (first payment due on the contract's start date, amount = lease monthly rent, currency = COP)

> **Tip**: To simulate a failed signing, send `"status": "FAILED"` — the contract will remain in `SIGNATURE_PENDING` and no scheduled payment is created.

---

## Payment Flow

After a contract is signed, scheduled payments are **automatically created** (this was added as part of the bug #6 fix — previously no payments were created on signing). The tenant can then initiate payment through the gateway.

### Step-by-Step

1. **Verify scheduled payment exists**:
   - After the signing webhook with `status: "COMPLETED"`, a `ScheduledPayment` record is created automatically
   - Tenant navigates to `/mis-pagos` and should see the scheduled payment

2. **Initiate payment** (as tenant):
   - Via UI: click "Pagar" on the scheduled payment in `/mis-pagos`
   - Via API: `POST /payments/initiate` with JWT auth
   - The `PaymentGatewayAdapter` auto-approves and returns a mock redirect URL
   - In a real integration, the user would be redirected to PSE; with the stub, the redirect URL is a mock

3. **Simulate payment confirmation** (manual webhook call):

   The payment gateway would normally call this endpoint after processing. Call it manually to confirm the payment:

   ```bash
   curl -X POST http://localhost:3001/payments/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "scheduledPaymentId": "<SCHEDULED_PAYMENT_ID>",
       "externalTransactionId": "mock-txn-123",
       "status": "APPROVED",
       "amount": 1200000,
       "currency": "COP"
     }'
   ```

   **Payload fields** (`PaymentWebhookDto`):

   | Field | Type | Required | Description |
   |-------|------|----------|-------------|
   | `scheduledPaymentId` | string | Yes | The scheduled payment UUID from the platform |
   | `externalTransactionId` | string | Yes | Transaction ID from the gateway (use any mock value) |
   | `status` | `"APPROVED"` \| `"REJECTED"` | Yes | Payment result |
   | `amount` | number | Yes | Amount processed (e.g., `1200000` for $1.200.000 COP) |
   | `currency` | string | Yes | Currency code (use `"COP"`) |

4. **Result** (when `status: "APPROVED"`):
   - Payment is recorded as confirmed
   - Notification sent to landlord (visible in server logs)
   - Payment appears in tenant's history at `/mis-pagos`
   - Landlord sees income reflected in `/mis-ingresos`

> **Tip**: To simulate a rejected payment, send `"status": "REJECTED"` — the scheduled payment remains pending.

---

## Full Rental Lifecycle

End-to-end testing checklist from property listing to payment confirmation:

| # | Step | Actor | How |
|---|------|-------|-----|
| 1 | Register landlord account | Landlord | `POST /auth/register` or via `/auth/registro` UI |
| 2 | Register tenant account | Tenant | `POST /auth/register` or via `/auth/registro` UI |
| 3 | Create portfolio | Landlord | Navigate to `/mi-portafolio` → create portfolio |
| 4 | Add unit to portfolio | Landlord | Navigate to portfolio → add unit with property details |
| 5 | Create lease for unit | Landlord | Navigate to unit → create lease (sets monthly amount, start date) |
| 6 | Publish listing | Landlord | Navigate to unit → publish listing with photos |
| 7 | Search and find listing | Tenant | Navigate to `/explorar` → search/filter → view listing detail |
| 8 | Contact landlord | Tenant | Click "Contactar arrendador" on listing detail |
| 9 | Upload contract PDF | Landlord | Navigate to `/mis-contratos` → upload contract for the lease |
| 10 | Initiate signing | Landlord | Open contract → click "Iniciar firma" |
| 11 | **Manual: call signing webhook** | Tester | `curl -X POST http://localhost:3001/contracts/webhook/signing ...` (see E-Signature Flow above) |
| 12 | Verify contract is SIGNED | Both | Check contract status in `/mis-contratos` or `/mis-contratos-arrendatario` |
| 13 | Verify scheduled payment created | Tenant | Navigate to `/mis-pagos` — payment should appear automatically |
| 14 | Initiate payment | Tenant | Click "Pagar" on the scheduled payment |
| 15 | **Manual: call payment webhook** | Tester | `curl -X POST http://localhost:3001/payments/webhook ...` (see Payment Flow above) |
| 16 | Verify payment confirmed | Both | Tenant sees payment in history; landlord sees income in `/mis-ingresos` |

### Quick Reference — Both Webhook Calls

```bash
# 1. Complete signing
curl -X POST http://localhost:3001/contracts/webhook/signing \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "<CONTRACT_ID>",
    "externalSigningId": "mock-signing-id",
    "status": "COMPLETED",
    "completedAt": "2026-01-15T10:00:00.000Z"
  }'

# 2. Confirm payment
curl -X POST http://localhost:3001/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledPaymentId": "<SCHEDULED_PAYMENT_ID>",
    "externalTransactionId": "mock-txn-123",
    "status": "APPROVED",
    "amount": 1200000,
    "currency": "COP"
  }'
```

---

## Messaging

The `MessagingChannelAdapter` is a **console-only stub** — it logs all notification payloads to the NestJS server output. No manual intervention is needed.

### What to Expect in Server Logs

When notifications are triggered (e.g., after contract signing or payment confirmation), you will see log entries like:

```
[MessagingChannelAdapter] [WHATSAPP] Notification sent to user <userId> | event: CONTRACT_SIGNED | data: {...}
```

### Verification

- Check the terminal running `npm run start:dev` in `src/backend/`
- Look for `[MessagingChannelAdapter]` log entries
- Notifications are fire-and-forget — failures are logged as warnings but do not block the main flow

### No Manual Steps Required

Unlike the e-signature and payment stubs, the messaging stub completes its work immediately by logging to console. There is no webhook endpoint to call and no state to advance manually.
