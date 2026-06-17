# AGENTS.md

## Project

Escrova is a NestJS backend API for a Nigerian peer-to-peer escrow marketplace.

The platform helps buyers and sellers transact safely by holding buyer payments in escrow until products are delivered and verified. It supports marketplace discovery, seller storefronts, digital escrow, buyer confirmation, seller dispatch evidence, disputes, internal wallets, ledger records, and end-of-day seller settlements.

The project was previously referred to as TrustMarket in the business requirements document. In the codebase, product-facing names should use **Escrova** unless legacy document references are being discussed.

---

## Primary Goal

Build a secure, auditable, testable, and maintainable backend API for Escrova.

Correctness is more important than speed, especially for escrow, wallet, payment, settlement, dispute, and admin flows.

---

## Tech Stack

* Framework: NestJS
* Language: TypeScript
* Runtime: Node.js
* Database: PostgreSQL
* Database Runtime: Docker
* ORM: Prisma
* Validation: Zod
* API Documentation: Swagger/OpenAPI
* Testing: Jest
* Authentication: JWT access tokens and refresh tokens
* Package Manager: Use the package manager already present in the repository
* Environment Config: Use `@nestjs/config` or the existing project configuration approach

---

## Core Principles

* Follow existing code patterns strictly.
* Prefer simplicity over unnecessary abstraction.
* Keep controllers thin.
* Put business logic in services.
* Keep modules feature-based.
* Do not introduce new libraries unless explicitly requested or clearly necessary.
* Never hardcode secrets, credentials, tokens, API keys, or database URLs.
* Do not rewrite unrelated files.
* Do not make broad refactors during feature work.
* Prioritize clear, testable, secure code over clever code.

---

## Local Development and Database Assumption

PostgreSQL must run through Docker.

Do not assume PostgreSQL is installed directly on the host machine.

Before database-related work, inspect the repository for:

* `docker-compose.yml`
* `compose.yml`
* `infra/docker-compose.yml`
* `.env`
* `.env.example`
* `prisma/schema.prisma`
* database scripts in `package.json`

If the project contains `infra/docker-compose.yml`, treat it as the source of truth unless the user explicitly asks to change Docker setup.

Expected local database startup command may be:

```bash
docker compose up -d postgres
```

or, if the project uses an infra folder:

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

or, if the service name is not known:

```bash
docker compose up -d
```

Do not invent Docker service names if they already exist in the repository.

If Docker Compose does not exist yet, propose a minimal PostgreSQL Docker Compose setup before adding it.

---

## Recommended Local PostgreSQL Defaults

If the project does not already define local Docker PostgreSQL settings, use safe development defaults such as:

```env
POSTGRES_USER=escrova
POSTGRES_PASSWORD=escrova_password
POSTGRES_DB=escrova_db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://escrova:escrova_password@localhost:5432/escrova_db?schema=public
```

These values are for local development only.

Never use development credentials for production.

---

## Important Commands

Before running commands, inspect `package.json` and use the scripts already defined in the project.

Common commands may include:

```bash
npm install
npm run start:dev
npm run build
npm run test
npm run test:e2e
npm run lint
npx prisma generate
npx prisma migrate dev
npx prisma studio
```

If the project uses `yarn`, `pnpm`, or `bun`, use the existing package manager instead of switching to another one.

---

## Repository Awareness

Before making changes:

1. Inspect the existing folder structure.
2. Read relevant documentation files in `docs/`.
3. Read `prisma/schema.prisma` if database work is involved.
4. Read nearby modules before creating new patterns.
5. Follow existing project conventions where they are reasonable.

Do not rewrite unrelated files.

Do not introduce a new architecture without explaining why.

---

## Documentation Files

Use these documents as project guidance when they exist:

* `docs/PRODUCT_BRIEF.md`
* `docs/ARCHITECTURE.md`
* `docs/DATABASE_MODEL.md`
* `docs/API_CONVENTIONS.md`
* `docs/ESCROW_STATE_MACHINE.md`
* `docs/SECURITY_RULES.md`
* `docs/PAYMENT_FLOW.md`
* `docs/SKILLS.md`
* `skills.md`

If `skills.md` or `docs/SKILLS.md` exists, consult it before implementing business logic.

If a required document is missing, continue with the available information and suggest the missing document as follow-up.

---

## Recommended Project Structure

Use a feature-based modular NestJS structure.

Recommended structure:

```txt
src/
  common/
    decorators/
    dto/
    enums/
    exceptions/
    filters/
    guards/
    interceptors/
    pipes/
    responses/
    schemas/
    utils/
  config/
  database/
  modules/
    auth/
    users/
    buyer-profiles/
    seller-profiles/
    storefronts/
    categories/
    products/
    carts/
    orders/
    escrow/
    payments/
    wallets/
    disputes/
    kyc/
    settlements/
    notifications/
    admin/
    audit-logs/
```

Each feature module should usually include:

```txt
module-name/
  dto/
  schemas/
  module-name.controller.ts
  module-name.service.ts
  module-name.module.ts
  module-name.service.spec.ts
```

Add repositories only if the project has adopted a repository pattern or the module complexity justifies it.

---

## Controller Rules

Controllers must be thin.

Controllers may only:

* Receive requests.
* Apply route decorators.
* Apply guards and authorization decorators.
* Accept validated DTOs.
* Call service methods.
* Return service results.

Controllers must not contain:

* Business logic.
* Database logic.
* Financial calculations.
* Escrow state transitions.
* Wallet balance mutations.
* Payment verification logic.
* Complex transformations.

Any computation, transformation, database operation, or domain decision belongs in services or dedicated domain helpers.

---

## Service Rules

Services contain business logic.

All services must use NestJS Dependency Injection.

Do not manually instantiate services with `new`.

External dependencies must be injected through constructors.

Services should be unit-test friendly.

Business logic must not depend directly on external state when it can be abstracted or injected.

All services must include JSDoc comments explaining:

* Class purpose.
* Each public method.
* Parameters.
* Return values.
* Important business rules or side effects where applicable.

Example:

```ts
/**
 * Handles seller storefront creation and management.
 *
 * Storefronts represent independent seller businesses under a single user account.
 * Each storefront owns its own wallet, KYC state, products, and payout configuration.
 */
@Injectable()
export class StorefrontsService {
  /**
   * Creates a new storefront for an authenticated user.
   *
   * @param userId - The authenticated user's ID.
   * @param dto - Validated storefront creation payload.
   * @returns The created storefront without sensitive banking metadata.
   */
  async createStorefront(userId: string, dto: CreateStorefrontDto) {
    // implementation
  }
}
```

No public service method should be undocumented.

---

## Dependency Rules

All dependencies must be handled through NestJS Dependency Injection.

Rules:

* No manual service instantiation using `new`.
* No hidden global dependencies.
* No direct construction of Prisma services outside NestJS DI.
* No direct construction of payment provider clients inside business methods.
* External services should be wrapped in injectable providers.
* Do not add new dependencies unless necessary.
* Before adding a dependency, check whether the project already has an existing package for that purpose.
* Explain why a new dependency is needed before adding it.
* Prefer stable, widely used packages.
* Avoid adding large dependencies for simple tasks.

Correct:

```ts
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
  ) {}
}
```

Incorrect:

```ts
const escrowService = new EscrowService();
```

---

## Validation Rules

All incoming request data must be validated using Zod.

Zod is the default validation standard for this project.

Do not use raw request bodies directly in services.

Each request payload must define both:

* A DTO class with Swagger decorators for API documentation.
* A Zod schema for runtime validation.

The DTO class and Zod schema must be defined in the same file so that validation rules and API documentation remain synchronized.

Do not rely solely on `z.infer` types for request DTOs because they do not provide Swagger metadata.

Recommended pattern:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const CreateStorefrontSchema = z.object({
  businessName: z.string().min(2).max(120),
  handle: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  businessCategoryId: z.string().uuid(),
  baseLocation: z.string().min(2),
  bankName: z.string().min(2),
  accountNumber: z.string().regex(/^\d{10}$/),
  accountName: z.string().min(2),
});

export type CreateStorefrontInput = z.infer<typeof CreateStorefrontSchema>;

export class CreateStorefrontDto {
  @ApiProperty({
    example: 'Tech Haven',
    minLength: 2,
    maxLength: 120,
  })
  businessName: string;

  @ApiProperty({
    example: 'tech-haven',
    description: 'Unique storefront handle',
  })
  handle: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  businessCategoryId: string;

  @ApiProperty({
    example: 'Lagos',
  })
  baseLocation: string;

  @ApiProperty({
    example: 'Access Bank',
  })
  bankName: string;

  @ApiProperty({
    example: '0123456789',
  })
  accountNumber: string;

  @ApiProperty({
    example: 'John Doe',
  })
  accountName: string;
}
```

Controllers should use the DTO class for Swagger documentation and request typing.

Validation should be performed using the corresponding Zod schema through the project's Zod validation pipe.

Every request DTO file should contain:

* The DTO class with Swagger decorators.
* The Zod schema.
* The inferred input type if needed internally.

This ensures API documentation, typing, and validation remain co-located and consistent.

```ts
```

Validation must happen before data reaches business logic.

Use a global or route-level Zod validation pipe.

Validation errors should return a clean client-safe response.

Do not expose raw Zod internals directly if the response becomes noisy or inconsistent.

Validation should cover:

* Required fields.
* String length.
* Email format.
* Phone number format where applicable.
* NUBAN account number format.
* Enum values.
* UUID or ID formats.
* Amount fields.
* File metadata where applicable.
* Pagination inputs.
* Query filters.
* Status values.

Do not mix `class-validator` and Zod in new code unless the existing codebase already uses `class-validator` and a migration decision has not yet been made.

If existing modules use `class-validator`, preserve them unless explicitly asked to migrate, but use Zod for all new modules.

---

## API Response Standard

All successful API endpoints must return a consistent response shape:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

For list endpoints, use:

```json
{
  "success": true,
  "data": [],
  "message": "Records retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

For empty successful responses, use:

```json
{
  "success": true,
  "data": null,
  "message": "Operation successful"
}
```

Errors must follow a consistent response shape:

```json
{
  "success": false,
  "message": "A safe error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

Never return raw Prisma errors, stack traces, raw Zod errors, payment provider secrets, or internal exception objects to clients.

Use a global response interceptor or helper where appropriate.

Use a global exception filter where appropriate.

---

## API Documentation Rules

All controllers must include Swagger documentation.

Controllers must include:

* `@ApiTags`
* `@ApiOperation`
* `@ApiResponse` or equivalent response decorators
* Auth decorators where applicable
* Clear endpoint descriptions

DTOs or Swagger classes must include `@ApiProperty` where the project uses Swagger DTO classes.

No endpoint should exist without Swagger documentation.

If Zod schemas are used, provide Swagger-compatible DTO classes or generated OpenAPI metadata using the project’s chosen approach.

---

## API Route Rules

Use RESTful conventions unless the existing project has a different pattern.

Recommended API prefix:

```txt
/api
```

Recommended versioning style, if versioning is enabled:

```txt
/api/v1
```

Examples:

```txt
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/verify-otp
GET /api/v1/products
POST /api/v1/orders
POST /api/v1/orders/:orderId/items/:itemId/dispatch
POST /api/v1/orders/:orderId/items/:itemId/confirm-delivery
POST /api/v1/orders/:orderId/items/:itemId/disputes
```

Do not create generic financial mutation endpoints such as:

```txt
PATCH /wallets/:id/balance
PATCH /escrow/:id/status
```

Financial and escrow actions must go through explicit business endpoints and service methods.

---

## Authentication and Authorization Rules

Use role-based access control.

Core roles:

* Guest
* Buyer
* Seller
* Admin

Guests may access public marketplace discovery only.

Buyers may manage:

* Cart
* Orders
* Delivery addresses
* Delivery confirmations
* Disputes
* Refund wallet visibility

Sellers may manage:

* Store profiles
* Products
* Inventory
* Dispatch evidence
* KYC
* Fulfilment
* Seller wallet visibility

Admins may manage:

* Users
* KYC verification
* Disputes
* Payout batches
* Categories
* Platform settings
* Activity logs

Every protected route must enforce authentication.

Every role-specific route must enforce authorization.

Never rely on client-side role checks for security.

---

## Security Rules

Security is critical because Escrova handles payments, wallets, KYC, disputes, and payouts.

Rules:

* Never return passwords, hashes, OTPs, tokens, or secrets in API responses.
* Always exclude sensitive fields using Prisma `select`, mappers, serializers, or response DTOs.
* Environment variables must never be logged.
* Always validate input.
* Always authorize access to user-owned resources.
* Hash passwords securely.
* Hash refresh tokens if stored.
* Hash payout PINs if implemented.
* Never store OTPs or reset tokens in plain text if persistence is required.
* Use expiry times for OTPs and reset tokens.
* Do not log sensitive data.

Sensitive data includes:

* Passwords
* Password hashes
* OTPs
* JWTs
* Refresh tokens
* Payment provider secrets
* Bank verification data
* Full KYC document values
* Payout PINs

A buyer must not access another buyer’s private orders.

A seller must not manage another seller’s store.

A seller must not dispatch or view private fulfilment details for another seller’s order item.

A user must not mutate wallet balances directly.

Admins should have controlled access and their sensitive actions must be logged.

---

## Escrova Domain Rules

The following business rules are critical and must not be bypassed.

1. Buyers do not pay sellers directly.
2. Buyer payments are held in escrow first.
3. Sellers can only dispatch after payment is confirmed.
4. Sellers do not receive available funds until a valid release condition occurs.
5. Valid release conditions include buyer confirmation, valid OTP confirmation, auto-release after the safety timer, or admin dispute resolution.
6. A buyer can dispute an order item before funds are released.
7. A dispute locks only the affected order item, not necessarily the full parent order.
8. Admins resolve disputes using available evidence.
9. Refunds go to the buyer wallet or another approved refund route.
10. Platform commission is recognized only after successful transaction completion.
11. Every important financial event must create an audit trail.
12. Every admin action affecting money, users, KYC, products, stores, disputes, or payouts must be logged.
13. A seller must complete required KYC before their products become publicly visible.
14. A seller store should have its own wallet.
15. A user may own multiple seller stores.

---

## Order and Escrow State Rules

Escrow and order flows must be implemented as state machines.

Do not allow arbitrary status changes.

Do not create generic update-status methods for escrow, orders, wallets, disputes, or payouts.

Use explicit methods such as:

```ts
markPaymentConfirmed()
markItemDispatched()
confirmDelivery()
openDispute()
resolveDisputeForBuyer()
resolveDisputeForSeller()
releaseEscrowToSeller()
refundEscrowToBuyer()
generatePayoutBatch()
markPayoutRecordSuccessful()
```

Each method must validate the current state before changing it.

Invalid transitions must throw a controlled application exception.

Recommended order item lifecycle:

```txt
PENDING_PAYMENT
PAID_IN_ESCROW
DISPATCH_PENDING
SHIPPED
DELIVERED
BUYER_CONFIRMED
DISPUTED
RELEASED
REFUNDED
CANCELLED
```

Recommended escrow lifecycle:

```txt
PENDING
FUNDED
HELD
DISPUTED
RELEASED
REFUNDED
CANCELLED
```

These can be adjusted if `docs/ESCROW_STATE_MACHINE.md` defines a better final version.

---

## Money and Wallet Rules

Never use floating point numbers for money.

Store money in the smallest currency unit, such as kobo.

Use integer values for money amounts.

Examples:

```txt
amountKobo
priceKobo
shippingFeeKobo
serviceFeeKobo
totalAmountKobo
```

Avoid decimal money fields unless there is an explicit project decision to use database decimals.

Every wallet movement must be traceable.

Prefer a ledger-based approach instead of directly mutating balances without records.

A wallet balance update must be accompanied by a corresponding ledger or transaction record.

Important wallet concepts:

* Buyer wallet
* Seller store wallet
* Platform wallet
* Available balance
* Escrow balance
* Pending payout balance
* Refund balance

If the existing schema uses balance columns, preserve auditability by creating transaction or ledger records for every balance change.

---

## Database and Prisma Rules

PostgreSQL runs only in Docker.

Prisma is the only ORM.

All database changes must go through Prisma migrations.

Do not manually edit generated Prisma client files.

After changing `prisma/schema.prisma`, run or recommend:

```bash
npx prisma format
npx prisma generate
npx prisma migrate dev
```

When adding models:

* Use clear relation names.
* Add indexes for frequently queried fields.
* Add unique constraints where the business requires uniqueness.
* Use enums for stable status values.
* Use timestamps such as `createdAt` and `updatedAt`.
* Use soft delete or visibility status where business logic requires recoverability.

Recommended unique fields include:

* User email
* Seller store handle
* Payment reference
* Transaction reference
* Payout batch reference

Do not create destructive migrations without warning.

If a migration may cause data loss, explain the risk before proceeding.

---

## Docker and Infrastructure Rules

PostgreSQL should run in Docker for local development.

Before running Prisma migrations:

1. Ensure Docker is running.
2. Ensure the PostgreSQL container is up.
3. Ensure `DATABASE_URL` points to the Docker PostgreSQL instance.
4. Run Prisma commands only after the database is reachable.

If connection fails, check:

* Docker container status
* Database port mapping
* `.env` values
* `DATABASE_URL`
* Prisma provider configuration

Do not change the database provider away from PostgreSQL.

Never modify Docker setup unless explicitly requested, except to propose a missing minimal setup.

If `infra/docker-compose.yml` exists, it is the source of truth.

---

## Error Handling Rules

All errors must go through NestJS exception filters or built-in `HttpException`.

Never throw raw errors or unknown exceptions to the client.

All service errors must be converted into meaningful HTTP exceptions or domain exceptions handled by filters.

Use appropriate HTTP status codes:

* 400 for invalid input
* 401 for unauthenticated requests
* 403 for unauthorized requests
* 404 for missing resources
* 409 for conflicts or invalid state transitions
* 422 for valid requests that fail business rules where applicable
* 500 only for unexpected server errors

Financial and state-machine errors should be clear but safe.

Example:

```txt
This order item cannot be released because it is currently under dispute.
```

Never return raw Prisma errors or stack traces to clients.

---

## Logging and Audit Rules

Use normal application logs for technical diagnostics.

Use audit logs for business-sensitive actions.

Audit logs should capture:

* Actor ID
* Actor role
* Action type
* Target type
* Target ID
* Reason where applicable
* Metadata where useful
* Timestamp

Admin actions must create audit logs when they affect:

* KYC
* Disputes
* Payouts
* Users
* Stores
* Products
* Platform settings
* Wallet outcomes
* Escrow outcomes

Do not log sensitive data.

---

## File Upload Rules

For product images, dispatch evidence, KYC documents, dispute evidence, and return waybills:

* Validate file type.
* Validate file size.
* Store files using the project’s configured storage provider.
* Store only file URLs or storage keys in the database.
* Do not store raw file content in regular database fields.
* Keep KYC and dispute evidence access restricted.

Accepted file types may include:

* PNG
* JPG/JPEG
* PDF where applicable

---

## Payment Rules

Do not assume a payment provider unless it is defined in project documentation or environment configuration.

Possible Nigerian payment providers may include:

* Paystack
* Flutterwave
* Monnify
* Bank transfer flows

Payment provider integration must be isolated behind a service interface where possible.

Webhook handlers must:

* Verify webhook signatures.
* Be idempotent.
* Reject duplicate processing.
* Store provider references.
* Avoid trusting client-side payment success claims.
* Update escrow only after server-side payment verification.

Never mark an order as paid based only on frontend confirmation.

---

## Background Job Rules

Use background jobs for delayed or scheduled actions where needed.

Important background tasks may include:

* Auto-release timer processing
* EOD payout batch generation
* Notification retries
* Payment verification retries
* Cleanup of expired OTPs or reset tokens

If no queue system exists yet, propose one before implementing complex background processing.

Do not implement fragile timer logic that only works while one local process is running unless it is explicitly acceptable for MVP.

---

## Testing Rules

Each module should be designed to be testable.

Business logic must not depend on external state directly.

Services should be unit-test friendly.

Every important feature should include tests.

At minimum, add tests for:

* Auth flows
* Role-based access
* Zod validation
* Order creation
* Escrow state transitions
* Invalid status transitions
* Wallet ledger movements
* Payment webhook idempotency
* Dispute opening and resolution
* Payout batch generation

For financial workflows, test both success and failure paths.

Before finishing a task, run relevant tests where possible.

If tests cannot be run, explain why and specify the command that should be run.

---

## Code Quality Rules

All services must include JSDoc comments explaining:

* Class purpose
* Each public method
* Parameters
* Return values

All controllers must include:

* Swagger decorators for endpoints
* Clear endpoint descriptions
* Auth/role documentation where applicable

DTOs or schema-backed request classes must include:

* Swagger property decorators where applicable
* Clear examples for important fields
* Validation expectations

No endpoint should exist without Swagger documentation.

No service method should be undocumented.

Do not leave incomplete TODO logic.

Do not leave dead code.

Do not leave unused imports.

Do not silently ignore TypeScript errors.

---

## Naming Rules

Use Escrova as the product name in new code and documentation.

Use consistent naming:

* `BuyerProfile`
* `SellerProfile`
* `Storefront`
* `Order`
* `OrderItem`
* `Wallet`
* `WalletLedgerEntry`
* `EscrowTransaction`
* `Dispute`
* `PayoutBatch`
* `PayoutRecord`
* `KycDocument`
* `AuditLog`

Avoid mixing `TrustMarket` into new code unless migrating legacy references.

---

## MVP Priority

Prioritize the MVP in this order:

1. Project foundation
2. Auth and roles
3. User profiles
4. Seller store creation
5. KYC submission
6. Categories
7. Products
8. Cart
9. Orders
10. Escrow records
11. Payment verification
12. Dispatch evidence
13. Buyer confirmation
14. Wallet ledger movement
15. Disputes
16. Admin resolution
17. Payout batch generation

Do not overbuild advanced features before the core escrow flow works.

---

## Implementation Workflow for Codex

For each task:

1. Read this `AGENTS.md`.
2. Read relevant files in `docs/`.
3. If present, consult `skills.md` before implementing logic.
4. Inspect the existing implementation.
5. Briefly propose the implementation plan.
6. Make focused changes only.
7. Add or update tests.
8. Run formatting, linting, build, or tests where appropriate.
9. Summarize what changed.
10. Mention any risks, assumptions, or follow-up work.

---

## When Asked to Build a Feature

Do not implement huge features in one step.

Prefer vertical slices.

A good vertical slice includes:

* Prisma schema update if needed
* Zod schema
* DTO or request type
* Service method
* Controller endpoint
* Authorization
* Validation
* Tests
* Swagger documentation
* API response wrapping

Example vertical slice:

```txt
Implement seller store creation for authenticated users.
```

Avoid implementing marketplace, checkout, escrow, wallets, disputes, and settlements all in one task.

---

## Before Completing Any Task

Before marking a task as complete:

1. Ensure code compiles.
2. Ensure NestJS structure is respected.
3. Ensure request validation uses Zod.
4. Ensure API responses follow the standard response shape.
5. Validate Prisma schema consistency if database changes exist.
6. Ensure DB migrations are created if needed.
7. Ensure sensitive fields are not returned.
8. Ensure Swagger documentation exists for new endpoints.
9. Ensure service methods include JSDoc.
10. Ensure no incomplete TODO logic remains.
11. Run relevant tests, build, or lint commands where possible.

---

## Definition of Done

A task is complete only when:

* Code is correct and complete.
* NestJS compiles without errors.
* API response format is consistent.
* Request validation is implemented with Zod.
* Controllers are thin.
* Services contain business logic.
* Services use Dependency Injection.
* Services include JSDoc documentation.
* Swagger documentation exists for endpoints.
* Prisma schema is consistent if DB changes exist.
* DB migrations are created if needed.
* No missing runtime dependencies exist.
* No sensitive data is leaked.
* Relevant tests are added or updated.
* Relevant commands have been run or clearly listed if they could not be run.

---

## Do Not Do

Do not bypass escrow rules.

Do not mutate balances without ledger records.

Do not trust frontend payment confirmation.

Do not allow sellers to release their own escrow funds.

Do not allow buyers to confirm delivery for another buyer’s order.

Do not allow admins to make sensitive changes without audit logs.

Do not expose KYC documents publicly.

Do not store secrets in code.

Do not log environment variables.

Do not change Docker, Prisma, or database settings without checking existing configuration.

Do not create broad, unrelated refactors during feature work.

Do not silently ignore failing tests.

Do not return raw Prisma errors.

Do not throw raw errors to clients.

Do not use raw request bodies directly in services.

Do not create endpoints without Swagger documentation.

Do not create undocumented public service methods.

---

## Final Response Format for Coding Tasks

When completing a coding task, summarize:

1. What changed
2. Files modified
3. Commands run
4. Test results
5. Assumptions made
6. Risks or limitations
7. Recommended next step
