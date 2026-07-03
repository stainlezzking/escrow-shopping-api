# ARCHITECTURE.md

## 1. Purpose

This document defines the backend architecture for Escrova.

Escrova is a NestJS API for a Nigerian peer-to-peer escrow marketplace. The architecture must support secure marketplace operations, item-level escrow, seller storefronts, wallet ledger accounting, disputes, KYC, and end-of-day payout batching.

The system should begin as a **modular monolith**, not microservices.

---

## 2. Architecture Style

Escrova should use a modular monolith architecture.

This means:

* One NestJS application.
* One PostgreSQL database.
* Feature-based modules.
* Clear service boundaries.
* No microservices at MVP stage.
* Internal modules communicate through service methods, not HTTP calls.

Why modular monolith:

* Easier to build and debug.
* Safer for first escrow implementation.
* Easier database transactions.
* Lower deployment complexity.
* Good enough until transaction volume demands separation.

---

## 3. Tech Stack

* Backend: NestJS
* Language: TypeScript
* Database: PostgreSQL
* Local database runtime: Docker
* ORM: Prisma
* Validation: Zod
* Auth: JWT
* API Docs: Swagger/OpenAPI
* Testing: Jest
* Background jobs: Nest scheduler or queue system, depending on complexity
* File storage: abstracted storage service

---

## 4. High-Level Layers

Use this general layering:

```txt
Controller
  -> Service
    -> Domain logic / helper
      -> Prisma/database
      -> External provider adapters
```

Responsibilities:

| Layer               | Responsibility                                      |
| ------------------- | --------------------------------------------------- |
| Controller          | HTTP routing, guards, Swagger docs, request handoff |
| Zod Validation Pipe | Validate body, params, and query                    |
| Service             | Business logic and orchestration                    |
| Domain helper       | Pure state-machine or calculation logic             |
| Prisma service      | Database access                                     |
| Provider adapter    | Payment, delivery, file storage, email/SMS integrations |

Controllers must stay thin.

Services own business logic.

Financial state transitions should be isolated in explicit service methods.

---

## 5. Recommended Folder Structure

```txt
src/
  main.ts
  app.module.ts

  common/
    decorators/
    enums/
    exceptions/
    filters/
    guards/
    interceptors/
    pipes/
    responses/
    types/
    utils/

  config/
    env.schema.ts
    app.config.ts
    database.config.ts
    jwt.config.ts
    payment.config.ts
    storage.config.ts

  database/
    prisma.module.ts
    prisma.service.ts

  modules/
    auth/
    users/
    buyer-profiles/
    seller-profiles/
    storefronts/
    kyc/
    categories/
    products/
    orders/
    deliveries/
    payments/
    escrow/
    wallets/
    disputes/
    settlements/
    notifications/
    admin/
    audit-logs/

  jobs/
    auto-release.job.ts
    payout-batch.job.ts
    reconciliation.job.ts

  integrations/
    payments/
      payment-provider.interface.ts
      paystack/
      flutterwave/
      monnify/
    storage/
      storage-provider.interface.ts
    deliveries/
      delivery-provider.interface.ts
      dellyman/
    messaging/
      notification-provider.interface.ts
```

The exact structure may adapt to the existing codebase, but feature modules should remain clear and separated.

---

## 6. Core Modules

## 6.1 Auth Module

Responsible for:

* Registration
* Login
* JWT issuing
* Refresh tokens
* Password reset
* OTP/MFA flow
* Role-aware login behavior

Must not expose password hashes, refresh token hashes, OTP hashes, or reset token hashes.

---

## 6.2 Users Module

Responsible for:

* Master user identity
* Role management
* Account status
* User profile lookup
* Admin user management

Should not contain seller storefront business logic.

---

## 6.3 Buyer Profiles Module

Responsible for:

* Buyer profile
* Buyer addresses
* Buyer wallet access
* Buyer order visibility

Buyers must only access their own resources.

---

## 6.4 Seller Profiles / Storefronts Module

Responsible for:

* Seller store creation
* Multi-store management
* Store handles and StoreURLs
* Bank account snapshot source
* Store status
* Store-level wallet
* Store ownership checks

A user may own multiple seller stores.

Products, order items, wallet access, and payout records must always be filtered by active `sellerProfileId`.

---

## 6.5 KYC Module

Responsible for:

* KYC document upload
* Seller verification status
* Admin approval/rejection
* KYC audit logs

Products from unverified stores should not be publicly visible.

KYC file access must be protected.

---

## 6.6 Categories Module

Responsible for:

* Business categories
* Product category hierarchy
* Recursive category tree
* Admin category management

Use parent-child category relationships.

---

## 6.7 Products Module

Responsible for:

* Product listings
* Product images
* Product attributes
* Product visibility
* Product search
* Public product details
* Seller inventory management

Public product search must exclude hidden products and inactive/unverified sellers.

---

## 6.8 Carts Module

Responsible for:

* Frontend-owned cart state
* Client-side quantity and selected attribute state
* Passing checkout item IDs and quantities to the backend at order initialization

Escrova does not persist cart items in PostgreSQL for the MVP. Cart state is convenience UI state and should live on the client until the buyer initializes checkout.

The backend must not trust client-side calculations. When the buyer places an order or proceeds to checkout, the Orders module must retrieve current products, verify availability and seller visibility, calculate totals, snapshot prices, and create the parent order and order items.

Cart is not financial truth. Order and payment records are.

---

## 6.9 Orders Module

Responsible for:

* Order initialization
* Order item creation
* Checkout totals
* Product availability validation
* Price snapshotting
* Shipping fee calculation
* Service fee calculation
* Buyer order views
* Seller fulfilment views
* Derived parent order status

Orders module should coordinate with Payments and Escrow, but wallet balance changes should happen through WalletsService.

---

## 6.10 Deliveries Module

Responsible for:

* Delivery quote requests
* Delivery provider booking after seller readiness
* Delivery provider abstraction
* Provider webhook ingestion
* Delivery event history
* Internal delivery status mapping
* Buyer delivery acceptance and rejection
* Return flow coordination

Escrova should support seller-managed delivery as a fallback, but the preferred direction is provider-coordinated delivery through an integration such as Dellyman where available.

Delivery must not be booked immediately after payment verification. Payment verification should make the order item eligible for seller preparation. The seller must mark the item as ready for pickup before Escrova books or schedules provider delivery.

Provider delivery status is evidence, not escrow release authority. Escrow release must still be triggered by buyer acceptance, valid OTP/confirmation, auto-release after the safety timer, or admin dispute resolution.

---

## 6.11 Payments Module

Responsible for:

* Payment initialization
* Provider verification
* Webhook handling
* Payment idempotency
* Payment status updates

Payment success must be verified server-side.

Do not trust frontend payment success.

Provider-specific logic should live behind a payment provider interface.

---

## 6.12 Escrow Module

Responsible for:

* Creating escrow allocations
* Holding funds
* Locking disputed escrow
* Releasing funds
* Refunding funds
* Enforcing escrow state machine

Escrow must be tracked at order-item level.

Escrow transitions must follow `docs/ESCROW_STATE_MACHINE.md`.

---

## 6.13 Wallets Module

Responsible for:

* Wallet creation
* Available balance
* Escrow balance
* Pending payout balance
* Ledger entries
* Wallet views
* Safe money movement methods

Wallet mutations must always create ledger records.

Do not expose generic balance update endpoints.

---

## 6.14 Disputes Module

Responsible for:

* Buyer dispute creation
* Dispute evidence
* Return evidence
* Admin review
* Admin resolution
* Triggering refund or release

Disputes lock only the affected order item.

Admin dispute resolution must create audit logs.

---

## 6.15 Settlements Module

Responsible for:

* EOD payout batch generation
* Payout record creation
* Payout export data
* Payout success/failure tracking
* Pending payout locking

Payout generation should move eligible seller funds from available balance to pending payout balance to prevent double payout.

---

## 6.16 Audit Logs Module

Responsible for:

* Admin activity logs
* System financial action logs
* Sensitive operation tracking

Audit logs should be append-only.

---

## 6.17 Notifications Module

Responsible for:

* Email/SMS/in-app notification orchestration
* Payment confirmation alerts
* Dispatch alerts
* Dispute alerts
* Payout alerts

Notification failures must not corrupt financial transactions.

---

## 7. Request Lifecycle

Typical request flow:

```txt
HTTP Request
  -> Global Guards
  -> Zod Validation Pipe
  -> Controller
  -> Service
  -> Prisma Transaction if needed
  -> Response Interceptor
  -> Standard API Response
```

All successful responses should follow:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

Errors should follow:

```json
{
  "success": false,
  "message": "Safe error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

---

## 8. Validation Architecture

Use Zod for request validation.

Validate:

* Body
* Params
* Query
* File metadata

Recommended pattern:

```txt
module/
  schemas/
    create-product.schema.ts
  dto/
    create-product.dto.ts
```

DTOs may be inferred from Zod schemas.

Validation must happen before business logic.

Do not pass raw request bodies into services.

---

## 9. Response Architecture

Use a global response interceptor or response helper to enforce standard API responses.

Avoid returning raw Prisma models.

Use mappers or selected fields to prevent sensitive data exposure.

List endpoints should include pagination metadata where applicable.

---

## 10. Error Handling Architecture

Use a global exception filter.

Handle:

* Zod validation errors
* Prisma known request errors
* Domain/business errors
* Auth errors
* Payment provider errors
* Unknown errors

Do not expose:

* Stack traces
* Raw Prisma errors
* Raw provider errors
* Secrets
* Database URLs

---

## 11. Financial Architecture

Financial operations must be transaction-safe.

Use database transactions for:

* Payment success processing
* Escrow creation
* Escrow release
* Refunds
* Dispute resolution
* Payout batching
* Payout confirmation
* Manual wallet adjustments

Money rules:

* Store money in kobo.
* Do not use floating point numbers.
* Use ledger records for every balance movement.
* Use idempotency keys for payment and payout flows.
* Do not release disputed escrow.
* Do not payout escrow or disputed funds.

---

## 12. State Machine Architecture

Escrow, order item, dispute, and payout states must be changed only through explicit service methods.

Do not create generic status mutation endpoints.

State rules should live in:

```txt
docs/ESCROW_STATE_MACHINE.md
```

Implementation may use:

```txt
src/modules/escrow/escrow-state.service.ts
src/modules/orders/order-item-state.service.ts
```

or pure helpers such as:

```txt
src/modules/escrow/domain/escrow-state-machine.ts
```

Invalid transitions should throw safe business exceptions.

---

## 13. Background Jobs

Use scheduled jobs for:

* Escrow auto-release
* EOD payout batching
* Buyer reminders
* Seller fulfilment alerts
* Reconciliation audits
* Expired OTP/reset token cleanup

For MVP, Nest scheduler may be acceptable.

For higher reliability, use a queue system such as BullMQ later.

Cron jobs that move money must:

* Use transactions.
* Be idempotent.
* Create ledger records.
* Create audit logs where required.
* Fail safely.

---

## 14. External Integrations

Provider integrations should be isolated behind interfaces.

Examples:

```txt
PaymentProvider
DeliveryProviderAdapter
StorageProvider
NotificationProvider
BankVerificationProvider
```

Business services should depend on interfaces/adapters, not direct provider SDK calls where possible.

Payment providers may include:

* Paystack
* Flutterwave
* Monnify
* Bank transfer/manual flow

Do not assume a provider unless configured.

---

## 15. File Storage Architecture

Use a storage abstraction for:

* Product images
* KYC documents
* Dispatch and delivery evidence
* Dispute evidence
* Return waybills

Store only URLs or storage keys in PostgreSQL.

KYC and dispute files must not be publicly exposed without authorization.

---

## 16. Security Architecture

Security rules are defined in:

```txt
docs/SECURITY_RULES.md
```

At minimum:

* Use authentication guards.
* Use role guards.
* Use ownership checks.
* Validate requests with Zod.
* Exclude sensitive fields.
* Hash secrets and tokens.
* Verify payment webhooks.
* Audit admin financial actions.

---

## 17. Testing Architecture

Use Jest.

Test at three levels:

| Level             | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| Unit tests        | Service logic, state transitions, calculations  |
| Integration tests | Prisma/database-backed flows                    |
| E2E tests         | HTTP routes, guards, validation, response shape |

Priority tests:

* Auth and role checks
* Zod validation
* Product visibility
* Order initialization
* Payment idempotency
* Escrow release/refund
* Dispute lock
* Wallet ledger entries
* Payout batching
* Sensitive field exclusion

---

## 18. MVP Build Order

Build in this order:

1. Foundation: config, Prisma, Docker Postgres, response format, errors, Zod pipe, Swagger
2. Auth and users
3. Buyer profile and addresses
4. Seller profiles and store creation
5. KYC submission and admin review
6. Categories and business categories
7. Products and product images
8. Frontend cart contract and backend order initialization
9. Orders and order items
10. Delivery quote and provider abstraction
11. Payment initialization and verification
12. Seller ready-for-pickup and delivery booking
13. Escrow creation and hold
14. Dispatch/delivery evidence
15. Buyer acceptance or rejection
16. Wallet release and ledger entries
17. Disputes, returns, and admin resolution
18. Payout batching
19. Background jobs

---

## 19. Codex Implementation Rules

When implementing architecture:

1. Read `AGENTS.md`.
2. Read this file.
3. Read `DATABASE_MODEL.md`.
4. Read `ESCROW_STATE_MACHINE.md`.
5. Read `SECURITY_RULES.md`.
6. Inspect the existing codebase before changing structure.
7. Make one vertical slice at a time.
8. Do not implement multiple major modules in one task.
9. Do not introduce microservices.
10. Do not create generic financial mutation endpoints.
11. Do not bypass Zod validation.
12. Do not return raw Prisma models from sensitive endpoints.

---

## 20. Final Rule

The architecture should stay boring, modular, and safe.

Escrova should not become complex before the escrow, wallet, dispute, and payout flows are correct.
