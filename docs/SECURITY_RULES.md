# SECURITY_RULES.md

## 1. Purpose

This document defines the minimum security rules for Escrova.

Escrova handles user identities, seller stores, KYC documents, payments, escrow, wallets, disputes, and payouts. Security must be treated as a core product requirement, not an afterthought.

---

## 2. Core Security Principles

1. Never trust the client.
2. Validate every request.
3. Authorize every protected action.
4. Do not expose sensitive data.
5. Do not log secrets.
6. Do not mutate money without ledger records.
7. Do not release escrow without a valid state transition.
8. Every sensitive admin action must be audited.
9. Payment success must be verified server-side.
10. Delivery provider status must be treated as evidence, not escrow release authority.
11. Security rules must be enforced on the backend, not only in the UI.

---

## 3. Authentication Rules

Use JWT-based authentication unless the project adopts another documented method.

Recommended approach:

* Short-lived access tokens.
* Refresh tokens if long sessions are needed.
* Refresh tokens must be hashed if stored.
* Passwords must be hashed using a secure password hashing algorithm.
* Do not store plaintext passwords.
* Do not return password hashes in API responses.

Sensitive auth actions:

* Login
* Register
* Refresh token
* Logout
* Forgot password
* Reset password
* OTP verification
* MFA verification

These actions should be rate-limited where possible.

---

## 4. Authorization Rules

Every protected route must check authentication.

Every role-specific route must check authorization.

Core roles:

```txt
BUYER
SELLER
ADMIN
```

Guest users may only access public marketplace discovery.

Buyers may only access their own:

* Profile
* Orders
* Backend checkout/order initialization results
* Delivery addresses
* Disputes
* Refund wallet

Sellers may only access resources linked to their own seller profile/store:

* Storefront
* Products
* Order items
* Delivery readiness and provider booking records for their own order items
* Dispatch evidence
* KYC records
* Seller wallet
* Payout records

Admins may access platform operations, but sensitive admin actions must be audited.

Never rely on frontend role checks.

---

## 5. Ownership Rules

Authorization must include ownership checks.

Examples:

* A buyer cannot confirm delivery for another buyer’s order item.
* A buyer cannot reject delivery for another buyer’s order item.
* A buyer cannot open a dispute for another buyer’s order item.
* A seller cannot dispatch another seller’s order item.
* A seller cannot mark another seller’s order item as ready for pickup.
* A seller cannot book delivery for another seller’s order item.
* A seller cannot view another seller’s wallet.
* A seller cannot update another seller’s product.
* A user cannot access another user’s KYC documents.
* A non-admin cannot resolve disputes.
* A non-admin cannot generate payout batches.

---

## 6. Validation Rules

All incoming request data must be validated with Zod.

Validate:

* Request body
* Route params
* Query params
* File metadata
* Enum values
* Money fields
* Checkout product IDs, quantities, and selected attributes
* Delivery quote, shipment, and provider references
* Pagination
* Sort fields
* IDs and references

Do not pass raw request bodies into services.

Validation must happen before business logic.

Validation errors must use the project’s standard API error response format.

---

## 7. Sensitive Data Rules

Never return these fields in API responses:

```txt
passwordHash
refreshTokenHash
otpHash
resetTokenHash
payoutPinHash
paymentProviderSecret
webhookSecret
full KYC document numbers
private KYC file URLs
raw provider verification payloads
raw delivery provider webhook payloads
```

Only authorized users may view limited banking details.

KYC documents must be visible only to:

* The seller who owns the store
* Authorized admins

Use `select`, response mappers, or serializers to exclude sensitive fields.

---

## 8. Password, OTP, and Token Rules

Passwords:

* Minimum 8 characters.
* Hash before storage.
* Never log passwords.
* Never return password hashes.

OTPs:

* Store hashed OTPs if persisted.
* Set expiry time.
* Mark as used after successful verification.
* Do not allow reuse.
* Do not expose OTPs to sellers.
* Delivery OTPs are buyer-side sensitive data.

Delivery confirmation links, QR codes, GUIDs, or acceptance tokens:

* Must be unguessable.
* Must be scoped to one buyer and one order item.
* Must expire or be single-use.
* Must not be accepted for another buyer’s order item.
* Must not expose sensitive order details in the token itself.

Reset tokens:

* Store hashed token if persisted.
* Set expiry time.
* Invalidate after use.

---

## 9. Payment Security Rules

Never mark payment as successful from frontend confirmation alone.

Payment success must be confirmed by:

* Verified webhook, or
* Server-side provider verification.

Webhook handlers must:

* Verify provider signature.
* Be idempotent.
* Reject invalid signatures.
* Avoid duplicate wallet or ledger entries.
* Store provider reference.
* Return safe errors.

Do not log payment provider secrets.

Do not expose raw provider payloads to normal users.

---

## 10. Delivery Provider Security Rules

Delivery provider integrations must be isolated behind provider adapters.

Provider webhooks must:

* Verify provider signature or another documented authenticity mechanism.
* Be idempotent using provider event IDs or stable provider references.
* Reject invalid signatures and unknown shipments.
* Store provider references and normalized event records.
* Avoid exposing raw provider payloads to normal users.
* Avoid logging provider secrets, webhook signatures, or buyer contact details unnecessarily.

Provider events may update `DeliveryShipment` and append `DeliveryEvent` records.

Provider events must not directly:

* Confirm buyer acceptance.
* Release escrow.
* Refund escrow.
* Resolve disputes.
* Mutate wallet balances.

Buyer acceptance or rejection must come through Escrova-controlled confirmation flows, valid OTP/QR/token confirmation, auto-release after the safety timer, or admin dispute resolution.

Frontend cart data is never financial truth. At order initialization, the backend must fetch current product records, validate visibility and stock, recalculate product totals, delivery fees, service fees, and store the final checkout snapshot on orders and order items.

---

## 11. Escrow and Wallet Security Rules

Escrow and wallet operations must use strict service methods.

Forbidden endpoints:

```txt
PATCH /wallets/:id/balance
PATCH /escrow/:id/status
PATCH /orders/:id/status
```

Use business actions instead:

```txt
confirmPayment
markOrderItemReadyForPickup
bookDeliveryForReadyOrderItem
dispatchOrderItem
confirmDelivery
rejectDelivery
openDispute
resolveDispute
releaseEscrow
refundEscrow
generatePayoutBatch
```

Money rules:

* Store money in kobo.
* Do not use floating point values.
* Use database transactions for money movement.
* Every balance change must create a ledger entry.
* Escrow release must follow the state machine.
* Disputed funds must not be released or paid out.
* Payout batching must prevent double payout.

---

## 12. Dispute Security Rules

A dispute can only be opened by the buyer who owns the order item.

A dispute must lock only the affected order item’s escrow.

Admins must provide a reason when resolving disputes.

Dispute resolution must:

* Create an audit log.
* Trigger either refund or seller release.
* Prevent duplicate resolution.
* Prevent auto-release while dispute is active.

---

## 13. Admin Security Rules

Admin actions must be audited when they affect:

* Users
* Seller stores
* KYC
* Products
* Orders
* Escrow
* Wallets
* Disputes
* Payouts
* Platform settings

Audit logs should capture:

```txt
actorId
actorRole
actionType
targetType
targetId
reason
metadata
timestamp
```

Do not allow silent admin financial changes.

Manual wallet adjustments must require:

* Admin authentication
* Reason
* Ledger entry
* Audit log

---

## 14. File Upload Security Rules

Validate uploaded files.

Check:

* File type
* File size
* File extension
* Storage destination
* Access permissions

Allowed files may include:

```txt
PNG
JPG/JPEG
PDF
```

Apply stricter access control to:

* KYC documents
* Dispute evidence
* Waybill images
* Return evidence

Store file URLs or storage keys, not raw file content in normal database fields.

---

## 15. Logging Rules

Do not log:

```txt
passwords
tokens
OTPs
secrets
webhook signatures
payment provider keys
full KYC numbers
private file URLs
bank verification payloads
```

Logs should help debug issues without exposing private data.

Use audit logs for business-sensitive actions.

Use application logs for technical errors.

---

## 16. API Error Rules

Errors must follow the standard API response format.

Never expose:

* Stack traces
* Raw Prisma errors
* Raw Zod internals
* Raw payment provider secrets
* Database connection strings

Use safe error messages.

Example:

```json
{
  "success": false,
  "message": "You are not allowed to access this resource",
  "error": {
    "code": "FORBIDDEN"
  }
}
```

---

## 17. Database Security Rules

Do not delete financial history.

Do not delete:

* Payments
* Escrow records
* Wallets
* Ledger entries
* Payout records
* Disputes
* Admin activity logs

Use transactions for:

* Payment confirmation
* Backend order initialization from frontend cart payloads
* Delivery booking after seller readiness
* Delivery provider webhook processing when order item state changes
* Escrow release
* Refunds
* Dispute resolution
* Payout batching
* Manual adjustments

Use Prisma `select` to limit returned fields.

---

## 18. Environment and Secrets Rules

Secrets must come from environment variables.

Never commit:

```txt
.env
private keys
payment provider secrets
JWT secrets
database passwords
webhook secrets
```

`.env.example` may include variable names but not real secret values.

Environment variables must not be logged.

---

## 19. Minimum Security Tests

Add tests for:

* Unauthorized access returns 401.
* Wrong role returns 403.
* Users cannot access another user's resources.
* Seller cannot access another seller's store/order item.
* Buyer cannot confirm another buyer's order item.
* Buyer cannot reject another buyer's order item.
* Seller cannot mark another seller's order item ready for pickup.
* Provider webhook cannot release escrow; release must come from buyer acceptance, auto-release, or admin resolution.
* Invalid payment webhook signature is rejected.
* Invalid delivery provider webhook signature is rejected.
* Duplicate webhook does not duplicate ledger entries.
* Duplicate delivery provider webhook does not duplicate delivery events or state transitions.
* Disputed escrow cannot be released by auto-release.
* Admin dispute resolution creates audit log.
* Sensitive fields are excluded from responses.

---

## 20. Final Rule

When security conflicts with convenience, choose security.

If a requested implementation weakens authentication, authorization, payment verification, escrow safety, wallet auditability, or KYC privacy, stop and explain the risk before coding.
