# FluxDrop Phase 6: Payment Service & Transaction Reliability Architecture

## 1. Complete Payment Service Architecture

The Payment Service is a strictly isolated, PCI-conscious microservice. It abstracts third-party payment gateways (Razorpay, Stripe) behind a unified interface and serves as the financial source of truth. It interacts with the Order Service Orchestrator strictly via asynchronous RabbitMQ commands and replies.

---

## 2. Distributed Payment Workflow & 3. Saga Integration

**Saga Workflow (Payment Phase):**
1. **Command**: Order Service emits `payment.process_cmd` to RabbitMQ with `orderId` and `amount`.
2. **Intent Creation**: Payment Service creates a `Payment` record in `INITIATED` state and requests a "Payment Order/Intent" from Razorpay/Stripe.
3. **Client Handoff**: Payment Service returns the Gateway `order_id` to the API Gateway. The Mobile App securely loads the Razorpay SDK to complete the authorization.
4. **Webhook/Callback**: Razorpay sends a success webhook.
5. **Capture & Reply**: Payment Service validates the signature, captures the funds, updates the state to `CAPTURED`, and replies to the Order Service via RabbitMQ with `payment.completed`.
6. **Compensation Trigger**: If the Order Service later fails (e.g., Rider unassignable), it issues an `order.cancelled` compensation command, prompting the Payment Service to automatically trigger a `Refund`.

---

## 4. Idempotency Architecture & 10. Redis Locking Strategy

Financial transactions must never execute twice.

*   **API Level Idempotency**: All `POST` endpoints require an `Idempotency-Key` header. The Payment Service uses Redis `SETNX` to block duplicate network requests.
*   **Webhook Duplicate Prevention**: Payment Gateways guarantee "At Least Once" delivery, meaning we *will* receive duplicate webhooks. We hash the webhook payload and store the `provider_event_id` in Redis and PostgreSQL.
*   **Redis Redlock (Distributed Locks)**: A race condition exists where the Mobile App's success callback and the Webhook arrive at the exact same millisecond. We apply a Redis Lock on the `PaymentID`. Whichever request acquires the lock processes the state change; the second request sees the state is already `CAPTURED` and safely ignores it.

---

## 5. Webhook Processing Architecture

Webhooks are processed asynchronously to ensure high availability and prevent Gateway timeout penalties.

1. **Ingest & Validate**: API receives Webhook, validates `x-razorpay-signature` using HMAC SHA256.
2. **Persist Safely**: The raw payload is immediately saved to the `PaymentWebhook` PostgreSQL table with `processed: false` and acknowledged with `HTTP 200 OK`.
3. **Process Asynchronously**: A background worker picks up the webhook, updates the `Payment` state, creates a `LedgerEntry`, and emits `payment.captured` to RabbitMQ. Mark webhook as `processed: true`.

---

## 6. Prisma Schema Structure (PostgreSQL)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum PaymentStatus {
  INITIATED
  PENDING
  AUTHORIZED
  CAPTURED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
  CANCELLED
}

model Payment {
  id                String               @id @default(uuid())
  orderId           String               @unique
  userId            String
  amount            Decimal              @db.Decimal(10, 2)
  currency          String               @default("INR")
  provider          String               // 'RAZORPAY', 'STRIPE'
  providerPaymentId String?              @unique
  providerOrderId   String?              @unique
  status            PaymentStatus        @default(INITIATED)
  
  transactions      PaymentTransaction[]
  refunds           Refund[]
  ledgerEntries     LedgerEntry[]
  
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt
  
  @@index([userId])
  @@index([status])
}

model PaymentTransaction {
  id              String   @id @default(uuid())
  paymentId       String
  payment         Payment  @relation(fields: [paymentId], references: [id])
  type            String   // 'AUTHORIZATION', 'CAPTURE', 'FAILURE'
  gatewayResponse Json     // Snapshot of provider response
  createdAt       DateTime @default(now())
}

model PaymentWebhook {
  id              String   @id // Provider's Event ID (e.g., evnt_XYZ)
  provider        String
  payload         Json
  processed       Boolean  @default(false)
  createdAt       DateTime @default(now())
}
```

---

## 7. Immutable Ledger Design

To ensure mathematical perfection and support auditing, we use a Double-Entry style immutable ledger. Records can never be updated or deleted, only appended.

```prisma
enum LedgerType {
  DEBIT
  CREDIT
}

model LedgerEntry {
  id              String     @id @default(uuid())
  paymentId       String
  payment         Payment    @relation(fields: [paymentId], references: [id])
  type            LedgerType
  amount          Decimal    @db.Decimal(10, 2)
  balance         Decimal    @db.Decimal(10, 2) // Running balance snapshot
  description     String     // e.g., "Order #123 Captured", "Refund for missing item"
  createdAt       DateTime   @default(now())
}
```

---

## 8. Refund Architecture

1.  **Trigger**: Triggered via Saga compensation (`order.cancelled`) or Admin Dashboard.
2.  **Partial Refunds**: Supported via Admin API (e.g., if a specific item is missing). The system validates `Sum(Refunds) <= Payment.amount`.
3.  **Process**: Calls Razorpay Refund API -> Creates `Refund` record in PG -> Creates `DEBIT` entry in `LedgerEntry` -> Emits `payment.refunded`.

---

## 9. Retry, Failure Recovery & 13. Reconciliation Architecture

Gateways fail. Webhooks drop. We must actively monitor state.

*   **Active Reconciliation (Cron Job)**: A NestJS Cron job runs every 15 minutes, looking for `Payment` records stuck in `PENDING` state for more than 10 minutes.
*   **Verification**: It actively queries the Razorpay API `GET /payments/{id}`. If the payment was actually successful but the webhook dropped, the Cron Job manually advances the state to `CAPTURED` and triggers the Saga continuation.
*   **Timeouts**: If Razorpay reports the link expired or failed, the Cron updates state to `FAILED` and notifies the Order Service to abort.

---

## 11. Security Best Practices

1.  **Zero PII**: The Payment DB strictly handles IDs and amounts. We do not store PANs, Credit Card numbers, or CVVs. All PCI-sensitive data remains entirely within the Gateway's iframe/SDK.
2.  **Secret Rotation**: Webhook secrets and Gateway API Keys are injected via Kubernetes Secrets / AWS Secrets Manager and never logged.
3.  **Encrypted Payloads**: While we save the `gatewayResponse` JSON, any internal identifying secrets are scrubbed via a serialization interceptor before touching PostgreSQL.

---

## 12. Event-Driven Communication Design (RabbitMQ)

*   `payment.initiated`: Triggers analytics tools.
*   `payment.captured`: Required by the Order Saga to advance to `CONFIRMED`.
*   `payment.failed`: Triggers Saga compensation (Releases Restaurant Inventory).
*   `payment.refunded`: Triggers Notification Service (Sends "Your refund is initiated" email to the user).

---

## 14. API Route Structure

**Customer APIs:**
*   `POST /api/v1/payments/intent` (Requires `Idempotency-Key`)
*   `GET /api/v1/payments/verify/:orderId` (Polling endpoint for mobile app if websocket fails)
*   `GET /api/v1/payments/history`

**Webhook APIs (Public, Protected by HMAC):**
*   `POST /api/v1/webhooks/razorpay`
*   `POST /api/v1/webhooks/stripe`

**Admin APIs (RBAC: Finance Admin):**
*   `POST /api/v1/admin/payments/:id/refund`
*   `GET /api/v1/admin/payments/ledger` (View immutable logs)
*   `POST /api/v1/admin/payments/:id/reconcile` (Force manual status check)

---

## 15. Production-Grade Fintech Engineering Practices

1.  **Decimal Precision Strategy**: Floating point errors destroy payment systems. All amounts in PostgreSQL use `Decimal(10, 2)`. Within Node.js memory, all financial calculations are performed using the `decimal.js` library or converted to integer subunits (e.g., Paise/Cents) before transmission.
2.  **Anomaly Detection Hooks**: If the Daily Total Captured Amount deviates by > 20% from the 30-day moving average, the Payment Service drops an alert into a dedicated Slack channel via a background event, as this usually indicates a silent Gateway failure.
3.  **Webhook Replay Protection**: A webhook with a `created_at` timestamp older than 15 minutes is rejected immediately to prevent an attacker from replaying old captured webhook payloads.
