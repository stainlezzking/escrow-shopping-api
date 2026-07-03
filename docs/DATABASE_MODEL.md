# DATABASE_MODEL.md

## 1. Purpose

This document defines the recommended database model for Escrova.

Escrova is a NestJS, Prisma, and PostgreSQL backend for a Nigerian peer-to-peer escrow marketplace.

The database model must support:

* Users and roles
* Buyer profiles
* Seller storefronts
* Seller KYC
* Product listings
* Categories
* Frontend cart and backend checkout initialization
* Parent orders
* Order item-level escrow
* Payment verification
* Delivery provider quotes and shipments
* Dispatch evidence
* Buyer confirmation
* Disputes
* Internal wallets
* Ledger records
* Platform commission
* End-of-day payout batches
* Admin audit logs

The model should prioritize correctness, auditability, and financial traceability.

---

## 2. Core Database Rules

1. PostgreSQL is the database.
2. Prisma is the only ORM.
3. PostgreSQL runs through Docker in local development.
4. All schema changes must go through Prisma migrations.
5. Do not manually edit generated Prisma client files.
6. Do not use floating point numbers for money.
7. Store money in the smallest currency unit, such as kobo.
8. Use integer fields for money where possible.
9. Every financial movement must have a ledger record.
10. Do not mutate wallet balances without ledger entries.
11. Do not delete financial records.
12. Prefer soft-delete or status fields for business records.
13. Use enums for stable status values.
14. Use unique constraints for references and public identifiers.
15. Add indexes for frequently queried fields.
16. Avoid polymorphic relations unless there is a clear reason and the application enforces integrity carefully.

---

## 3. Naming Conventions

Use clear singular model names.

Recommended Prisma model names:

```txt id="mz9lb0"
User
BuyerProfile
SellerProfile
KycDocument
Wallet
WalletLedgerEntry
PlatformEntity
BusinessCategory
Category
Product
ProductImage
ProductAttribute
ProductCategory
SellerShippingSetting
Order
OrderItem
Payment
EscrowTransaction
DeliveryQuote
DeliveryShipment
DeliveryEvent
DispatchEvidence
DeliveryOtp
Dispute
DisputeMessage
ProductReview
SupportTicket
PayoutBatch
PayoutRecord
PlatformSetting
AdminActivityLog
```

Use `createdAt` and `updatedAt` consistently.

Use `deletedAt` only where soft delete is needed.

Use `isActive` only where the record remains usable but may be disabled.

Use `status` fields for lifecycle state.

---

## 4. ID Strategy

Recommended ID style:

```prisma id="wjqf8b"
id String @id @default(uuid())
```

Use UUIDs for public-facing and internal records unless the existing codebase already uses another standard.

Avoid exposing sequential numeric IDs publicly.

If the existing project already uses BigInt IDs, preserve the existing style unless a migration is explicitly requested.

---

## 5. Money Fields

All money fields should be integer kobo values.

Use names like:

```txt id="pvu23w"
amountKobo
priceKobo
shippingFeeKobo
serviceFeeKobo
totalAmountKobo
availableBalanceKobo
escrowBalanceKobo
pendingPayoutBalanceKobo
```

Do not use:

```txt id="4wv87d"
price: Float
amount: Float
balance: Float
```

Decimal may only be used if there is a deliberate project decision and all calculations are still handled safely.

Recommended Prisma type:

```prisma id="4hl3ja"
amountKobo BigInt
```

or:

```prisma id="8oknc7"
amountKobo Int
```

Use `BigInt` if the platform may process large transaction volume or high-value transactions.

Application code must handle Prisma `BigInt` serialization carefully.

---

## 6. Recommended Enums

The final enum names may be adjusted to match the codebase, but these meanings should remain.

```prisma id="b13njy"
enum UserRole {
  BUYER
  SELLER
  ADMIN
}

enum AccountStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum KycStatus {
  NOT_SUBMITTED
  PENDING
  VERIFIED
  REJECTED
}

enum StoreStatus {
  PENDING_KYC
  ACTIVE
  SUSPENDED
  HIDDEN
}

enum ProductStatus {
  DRAFT
  LIVE
  HIDDEN
  OUT_OF_STOCK
  SUSPENDED
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  PARTIALLY_FULFILLED
  COMPLETED
  CANCELLED
  REFUNDED
}

enum OrderItemStatus {
  PENDING_PAYMENT
  FUNDED
  AWAITING_DISPATCH
  DISPATCHED
  DELIVERED
  CONFIRMED
  DISPUTED
  RELEASED
  REFUNDED
  CANCELLED
}

enum EscrowStatus {
  PENDING
  FUNDED
  HELD
  DISPUTED
  RELEASED
  REFUNDED
  CANCELLED
}

enum PaymentStatus {
  INITIATED
  PENDING
  SUCCESS
  FAILED
  CANCELLED
  EXPIRED
}

enum PaymentProvider {
  PAYSTACK
  FLUTTERWAVE
  MONNIFY
  BANK_TRANSFER
  MANUAL
}

enum DeliveryProvider {
  SELLER_MANAGED
  DELLYMAN
}

enum DeliveryMethod {
  SELLER_MANAGED
  THIRD_PARTY_PROVIDER
}

enum DeliveryStatus {
  PENDING
  QUOTE_REQUESTED
  QUOTE_ACCEPTED
  BOOKED
  PICKUP_PENDING
  PICKED_UP
  ARRIVED_AT_DESTINATION
  DELIVERED_ACCEPTED
  DELIVERED_REJECTED
  RETURN_PENDING
  RETURNED
  FAILED
  CANCELLED
}

enum WalletOwnerType {
  BUYER
  SELLER
  PLATFORM
}

enum LedgerDirection {
  CREDIT
  DEBIT
}

enum LedgerEntryType {
  BUYER_PAYMENT
  ESCROW_HOLD
  ESCROW_RELEASE
  REFUND
  PLATFORM_COMMISSION
  PAYOUT
  PAYOUT_REVERSAL
  MANUAL_ADJUSTMENT
}

enum DisputeStatus {
  OPEN
  UNDER_REVIEW
  AWAITING_BUYER_RETURN
  RETURN_IN_TRANSIT
  RESOLVED_BUYER_WON
  RESOLVED_SELLER_WON
  CANCELLED
}

enum PayoutBatchStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum PayoutRecordStatus {
  PENDING
  PROCESSING
  SUCCESS
  FAILED
  CANCELLED
}

enum SupportTicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum DocumentType {
  NIN
  BVN
  DRIVERS_LICENSE
  VOTERS_CARD
  CAC
}

enum VisibilityStatus {
  ACTIVE
  HIDDEN
}
```

---

## 7. Core Model Groups

## 7.1 Identity and Access

### User

Represents a master identity.

A user can be a buyer, seller, admin, or a buyer who also owns seller profiles.

Recommended fields:

```txt id="h0i8bs"
id
email
passwordHash
role
status
phoneNumber
lastLoginAt
createdAt
updatedAt
```

Recommended constraints:

```txt id="8nb0od"
email unique
phoneNumber index
role index
status index
```

Sensitive fields must never be returned in API responses.

---

### BuyerProfile

Represents buyer-specific identity.

Recommended fields:

```txt id="61zkak"
id
userId
walletId
fullName
phoneNumber
status
createdAt
updatedAt
```

Relationships:

```txt id="mxvvbi"
BuyerProfile belongs to User
BuyerProfile has one Wallet
BuyerProfile has many BuyerAddress
BuyerProfile has many Order
BuyerProfile has many ProductReview
```

Recommended constraints:

```txt id="quw59w"
userId unique if one buyer profile per user
walletId unique
```

---

### SellerProfile

Represents an individual seller storefront/business.

A single user may own multiple seller profiles.

Recommended fields:

```txt id="4hg2zm"
id
userId
walletId
businessCategoryId
username
businessName
storeHandle
storeUrl
baseLocation
bankName
accountNumber
accountName
kycStatus
status
createdAt
updatedAt
```

Relationships:

```txt id="h2n31w"
SellerProfile belongs to User
SellerProfile has one Wallet
SellerProfile belongs to BusinessCategory
SellerProfile has many Products
SellerProfile has many SellerShippingSettings
SellerProfile has many KycDocuments
SellerProfile has many OrderItems
SellerProfile has many PayoutRecords
```

Recommended constraints:

```txt id="qeyktj"
storeHandle unique
storeUrl unique if persisted
walletId unique
userId index
businessCategoryId index
kycStatus index
status index
```

Important:

* Products from unverified sellers should remain hidden from the public marketplace.
* Each seller profile should have its own wallet.
* Bank account details should not be returned to unauthorized clients.

---

### KycDocument

Represents documents submitted for seller verification.

Recommended fields:

```txt id="db7jkw"
id
sellerProfileId
documentType
documentNumber
documentImageUrl
status
rejectionReason
reviewedByAdminId
reviewedAt
createdAt
updatedAt
```

Recommended constraints:

```txt id="3j884p"
sellerProfileId index
status index
documentType index
```

Security:

* KYC document URLs must not be publicly accessible unless signed or protected.
* Do not expose full document numbers to unauthorized users.
* Admin review actions must create audit logs.

---

## 7.2 Wallets and Ledger

### Wallet

Represents a balance container.

Wallets may belong to:

* Buyer profile
* Seller profile
* Platform entity

Recommended fields:

```txt id="c2m8oj"
id
ownerType
buyerProfileId
sellerProfileId
platformEntityId
availableBalanceKobo
escrowBalanceKobo
pendingPayoutBalanceKobo
payoutPinHash
status
createdAt
updatedAt
```

Important:

Avoid weak polymorphism where possible.

Instead of only storing:

```txt id="g1f3cr"
ownerId
ownerType
```

prefer nullable foreign keys with application-level validation:

```txt id="8jgzfx"
buyerProfileId
sellerProfileId
platformEntityId
```

Only one owner field should be set.

Recommended constraints:

```txt id="58rp3v"
buyerProfileId unique nullable
sellerProfileId unique nullable
platformEntityId unique nullable
ownerType index
status index
```

Wallet balances are cached/accounting balances.

Ledger entries are the source of audit history.

Do not mutate wallet balances without creating ledger entries.

---

### WalletLedgerEntry

Represents every wallet money movement.

Recommended fields:

```txt id="kvow5x"
id
walletId
direction
entryType
amountKobo
balanceBeforeKobo
balanceAfterKobo
reference
relatedOrderId
relatedOrderItemId
relatedEscrowId
relatedPaymentId
relatedPayoutRecordId
narration
metadata
createdAt
```

Recommended constraints:

```txt id="syzabm"
reference unique where appropriate
walletId index
entryType index
direction index
relatedOrderId index
relatedOrderItemId index
relatedPaymentId index
createdAt index
```

Important:

* Ledger entries should be append-only.
* Do not update ledger entries except for safe metadata corrections by admin/system.
* Never delete ledger entries.
* Use database transactions when creating ledger entries and updating wallet balances.

---

### PlatformEntity

Represents Escrova’s own platform account.

Recommended fields:

```txt id="lcdk75"
id
organizationName
corporateBankName
corporateAccountNumber
corporateAccountName
walletId
lastAuditAt
createdAt
updatedAt
```

Relationships:

```txt id="09jmhi"
PlatformEntity has one Wallet
```

Use this for platform commission and financial tracking.

---

## 7.3 Categories and Products

### BusinessCategory

Represents seller business niches such as fashion, gadgets, beauty, food, services, etc.

Recommended fields:

```txt id="r3c3zi"
id
name
description
status
createdAt
updatedAt
```

Recommended constraints:

```txt id="xowf8n"
name unique
status index
```

---

### Category

Represents product category hierarchy.

Recommended fields:

```txt id="qw6fsl"
id
name
slug
parentCategoryId
level
description
status
createdAt
updatedAt
```

Relationships:

```txt id="3le8mj"
Category may belong to parent Category
Category may have many child Categories
Category has many ProductCategory records
```

Recommended constraints:

```txt id="f86qx1"
slug unique
parentCategoryId index
level index
status index
```

Rules:

* Level 1 means root category.
* Level 2 means subcategory.
* Level 3 means leaf category.
* Products should ideally link to leaf categories, but this can be enforced later.

---

### Product

Represents seller product listing.

Recommended fields:

```txt id="40aehc"
id
sellerProfileId
title
slug
description
priceKobo
stockQuantity
status
viewCount
isActive
createdAt
updatedAt
deletedAt
```

Relationships:

```txt id="taxfe6"
Product belongs to SellerProfile
Product has many ProductImages
Product has many ProductAttributes
Product has many ProductCategory records
Product has many OrderItems
Product has many ProductReviews
```

Recommended constraints:

```txt id="a5x5zh"
sellerProfileId index
slug index
status index
isActive index
createdAt index
```

Optional unique constraint:

```txt id="t751qc"
sellerProfileId + slug unique
```

Rules:

* Products from unverified sellers must not be public.
* Hidden products should not appear in public marketplace discovery.
* Use `priceKobo`, not decimal price.
* Use `stockQuantity` for basic inventory.

---

### ProductImage

Recommended fields:

```txt id="j6pzsh"
id
productId
imageUrl
storageKey
isPrimary
sortOrder
createdAt
updatedAt
```

Recommended constraints:

```txt id="m7ekav"
productId index
isPrimary index
```

---

### ProductAttribute

Represents variation details such as color, size, memory, or material.

Recommended fields:

```txt id="kyjf8u"
id
productId
attributeName
attributeValue
stockQuantity
priceAddonKobo
isAvailable
createdAt
updatedAt
```

Recommended constraints:

```txt id="8odrnt"
productId index
attributeName index
```

---

### ProductCategory

Join table between Product and Category.

Recommended fields:

```txt id="ixc03y"
id
productId
categoryId
createdAt
```

Recommended constraints:

```txt id="47ktfm"
productId + categoryId unique
productId index
categoryId index
```

---

### SellerShippingSetting

Represents seller-defined shipping prices by destination state for seller-managed delivery fallback flows.

Provider delivery quotes should not rely on this table. Third-party provider fees should be stored as quote and shipment snapshots.

Recommended fields:

```txt id="mf5lu3"
id
sellerProfileId
destinationState
shippingPriceKobo
createdAt
updatedAt
```

Recommended constraints:

```txt id="3gczgr"
sellerProfileId + destinationState unique
sellerProfileId index
destinationState index
```

---

## 7.4 Frontend Cart and Checkout

### Frontend Cart

Escrova does not persist buyer cart items in PostgreSQL for MVP.

Cart state is frontend convenience state. The client may store selected product IDs, quantities, and selected attributes locally. When the buyer proceeds to checkout or places an order, the client sends the selected product IDs and quantities to the backend.

The backend must then:

1. Fetch current product records.
2. Validate product existence.
3. Validate product visibility and seller KYC/store status.
4. Validate stock availability.
5. Recalculate product totals, service fees, and delivery fees.
6. Snapshot prices and fees into `Order` and `OrderItem`.

Client-side cart totals are display hints only and must not be trusted as financial truth.

---

### Order

Represents a buyer checkout.

Recommended fields:

```txt id="pamz52"
id
buyerProfileId
orderReference
paymentId
status
totalProductAmountKobo
totalShippingFeeKobo
totalServiceFeeKobo
totalOrderAmountKobo
createdAt
updatedAt
cancelledAt
completedAt
```

Relationships:

```txt id="dnnmjw"
Order belongs to BuyerProfile
Order has many OrderItems
Order may have one or many Payments depending on payment strategy
```

Recommended constraints:

```txt id="3f1tof"
orderReference unique
buyerProfileId index
status index
paymentId index
createdAt index
```

Rules:

* Parent order status should usually be derived from order item statuses.
* A single order may include items from multiple sellers.
* Payment verification should update order and item states inside a transaction.

---

### OrderItem

Represents one product line within an order.

Recommended fields:

```txt id="ay2n7j"
id
orderId
productId
sellerProfileId
escrowTransactionId
quantity
unitPriceAtCheckoutKobo
productAmountKobo
shippingFeeKobo
serviceFeeKobo
netEscrowAmountKobo
status
deliveryHandledBy
safetyTimerExpiresAt
dispatchedAt
deliveredAt
confirmedAt
releasedAt
refundedAt
cancelledAt
createdAt
updatedAt
```

Relationships:

```txt id="ljss83"
OrderItem belongs to Order
OrderItem belongs to Product
OrderItem belongs to SellerProfile
OrderItem has one EscrowTransaction
OrderItem may have one DeliveryShipment
OrderItem has many DispatchEvidence records
OrderItem may have one DeliveryOtp
OrderItem may have many Disputes
```

Recommended constraints:

```txt id="v41s13"
orderId index
productId index
sellerProfileId index
status index
escrowTransactionId unique nullable
safetyTimerExpiresAt index
createdAt index
```

Rules:

* Escrow is tracked at the order item level.
* Disputes should lock only the affected order item.
* Seller release should happen per order item.
* Released and refunded items are terminal.
* `unitPriceAtCheckoutKobo` must be a snapshot and should not change if the product price later changes.
* Delivery provider status must not directly release escrow.

---

### DeliveryQuote

Represents a provider delivery quote calculated before payment.

Recommended fields:

```txt id="delivery_quote_fields"
id
buyerProfileId
provider
pickupState
pickupAddress
dropoffState
dropoffAddress
quotedFeeKobo
estimatedPickupAt
estimatedDeliveryAt
providerQuoteReference
expiresAt
metadata
createdAt
```

Recommended constraints:

```txt id="delivery_quote_constraints"
buyerProfileId index
provider index
providerQuoteReference index
expiresAt index
createdAt index
```

Rules:

* Quotes are not financial truth until snapshotted into an order.
* The backend must recalculate or validate delivery fees before order/payment initialization.
* Quote metadata must not expose provider secrets.

---

### DeliveryShipment

Represents delivery execution for an order item.

Recommended fields:

```txt id="delivery_shipment_fields"
id
orderItemId
provider
method
status
providerShipmentReference
trackingReference
deliveryFeeKobo
pickupAddressSnapshot
dropoffAddressSnapshot
readyForPickupAt
bookedAt
pickedUpAt
arrivedAtDestinationAt
acceptedAt
rejectedAt
returnedAt
failedAt
cancelledAt
metadata
createdAt
updatedAt
```

Recommended constraints:

```txt id="delivery_shipment_constraints"
orderItemId unique
provider index
method index
status index
providerShipmentReference index
trackingReference index
createdAt index
```

Rules:

* Provider booking should happen after payment verification and seller readiness.
* Seller readiness should be explicit, such as `markOrderItemReadyForPickup`.
* Provider status is evidence, not escrow release authority.
* Buyer acceptance should move delivery toward `DELIVERED_ACCEPTED`.
* Buyer rejection should move delivery toward `DELIVERED_REJECTED` and then the return/dispute flow.
* Return fees may be temporarily reserved from held funds, but final responsibility should be assigned by policy or dispute outcome.

---

### DeliveryEvent

Represents append-only delivery events from providers and internal delivery workflows.

Recommended fields:

```txt id="delivery_event_fields"
id
deliveryShipmentId
provider
providerEventId
providerStatus
internalStatus
eventPayload
occurredAt
createdAt
```

Recommended constraints:

```txt id="delivery_event_constraints"
deliveryShipmentId index
provider index
provider + providerEventId unique nullable where provider supplies stable event IDs
internalStatus index
occurredAt index
createdAt index
```

Rules:

* Delivery events should be append-only.
* Provider webhooks must be idempotent.
* Raw provider payloads should be stored carefully and not exposed directly to normal users.
* Provider-specific statuses such as in-transit, assigned, or rider-arrived can be preserved here even if they do not become first-class internal states.

---

## 7.5 Payments and Escrow

### Payment

Represents payment attempts and provider verification records.

Recommended fields:

```txt id="ju2kj8"
id
orderId
buyerProfileId
provider
providerReference
internalReference
status
amountKobo
currency
providerPayload
verifiedAt
failedAt
createdAt
updatedAt
```

Recommended constraints:

```txt id="3rtwi1"
providerReference unique nullable
internalReference unique
orderId index
buyerProfileId index
status index
provider index
createdAt index
```

Rules:

* Payment success must be verified server-side.
* Webhook processing must be idempotent.
* Do not trust frontend-only payment success.
* Store provider payload carefully and avoid secrets.
* If multiple payment attempts are allowed, do not make `orderId` globally unique.

---

### EscrowTransaction

Represents escrow allocation for a specific order item.

Recommended fields:

```txt id="j4sp1r"
id
orderItemId
sellerProfileId
buyerProfileId
paymentId
escrowReference
status
grossAmountKobo
sellerNetAmountKobo
platformFeeKobo
shippingFeeKobo
heldAt
disputedAt
releasedAt
refundedAt
cancelledAt
createdAt
updatedAt
```

Recommended constraints:

```txt id="20tydw"
orderItemId unique
escrowReference unique
sellerProfileId index
buyerProfileId index
paymentId index
status index
createdAt index
```

Rules:

* Only one active escrow transaction should exist per order item.
* Escrow status changes must follow `docs/ESCROW_STATE_MACHINE.md`.
* Releases and refunds must run in database transactions.
* Escrow release creates seller wallet and platform wallet ledger entries.
* Escrow refund creates buyer wallet ledger entries.
* Disputed escrow cannot auto-release.

---

### DispatchEvidence

Represents proof that an order item was dispatched or handled by a delivery provider.

Recommended fields:

```txt id="pbevm1"
id
orderItemId
sellerProfileId
evidenceType
imageUrl
storageKey
trackingReference
courierName
notes
uploadedAt
createdAt
updatedAt
```

Recommended constraints:

```txt id="rk01xi"
orderItemId index
sellerProfileId index
trackingReference index
uploadedAt index
```

Rules:

* Dispatch evidence is required before an item can become `DISPATCHED`.
* Evidence should be protected from unauthorized access.
* Evidence may be used in disputes.
* In provider delivery flows, proof of pickup, proof of delivery, provider tracking events, and rider notes may also be stored or linked as evidence.

---

### DeliveryOtp

Represents optional OTP-based buyer confirmation.

Recommended fields:

```txt id="4i8tbd"
id
orderItemId
otpHash
expiresAt
usedAt
createdAt
updatedAt
```

Recommended constraints:

```txt id="gqc4ys"
orderItemId unique
expiresAt index
usedAt index
```

Rules:

* Never store OTP in plain text.
* OTP must be linked to a specific order item.
* OTP must expire.
* OTP must not be reused.

---

## 7.6 Disputes and Support

### Dispute

Represents a buyer complaint for a specific order item.

Recommended fields:

```txt id="5hgt2b"
id
orderItemId
raisedByUserId
buyerProfileId
sellerProfileId
status
reason
evidenceImageUrl
evidenceStorageKey
returnWaybillImageUrl
returnStorageKey
returnStatus
adminResolutionReason
resolvedByAdminId
resolvedAt
createdAt
updatedAt
```

Recommended constraints:

```txt id="iysd68"
orderItemId index
buyerProfileId index
sellerProfileId index
status index
resolvedByAdminId index
createdAt index
```

Rules:

* A dispute should be opened only by the buyer who owns the order.
* A dispute should lock the affected escrow.
* Only one active dispute should exist per order item.
* Admin resolution must create an audit log.
* Buyer-winning dispute triggers refund.
* Seller-winning dispute triggers release.

---

### DisputeMessage

Optional but recommended for dispute communication and evidence history.

Recommended fields:

```txt id="5c89ed"
id
disputeId
senderUserId
message
attachmentUrl
attachmentStorageKey
createdAt
```

Recommended constraints:

```txt id="5vsvy9"
disputeId index
senderUserId index
createdAt index
```

---

### SupportTicket

Represents general support outside formal escrow disputes.

Recommended fields:

```txt id="1gloxv"
id
userId
subject
message
status
createdAt
updatedAt
closedAt
```

Recommended constraints:

```txt id="yln6ns"
userId index
status index
createdAt index
```

---

## 7.7 Reviews and Addresses

### ProductReview

Represents buyer feedback after purchase.

Recommended fields:

```txt id="nkhzwp"
id
productId
buyerProfileId
orderItemId
rating
comment
createdAt
updatedAt
```

Recommended constraints:

```txt id="eadvhk"
productId index
buyerProfileId index
orderItemId unique
rating index
createdAt index
```

Rules:

* Reviews should usually require a completed/released order item.
* A buyer should not review the same order item twice.

---

### BuyerAddress

Represents buyer delivery addresses.

Recommended fields:

```txt id="0m1yi2"
id
buyerProfileId
contactName
phoneNumber
state
streetAddress
isDefault
createdAt
updatedAt
```

Recommended constraints:

```txt id="zgg991"
buyerProfileId index
state index
isDefault index
```

Rules:

* A buyer may have multiple addresses.
* Only one address should be default per buyer.
* Application logic should enforce one default address.

---

## 7.8 Payouts and Settings

### PayoutBatch

Represents an end-of-day payout batch.

Recommended fields:

```txt id="k9aghc"
id
batchReference
status
totalAmountKobo
sellerCount
generatedByAdminId
generatedAt
settledAt
createdAt
updatedAt
```

Recommended constraints:

```txt id="2ln9wg"
batchReference unique
status index
generatedAt index
generatedByAdminId index
```

Rules:

* Payout batch should include only available seller balances.
* Escrow and disputed balances must not be included.
* Batch generation should be auditable.

---

### PayoutRecord

Represents a payout to a specific seller store.

Recommended fields:

```txt id="kjgrru"
id
batchId
sellerProfileId
sellerWalletId
amountKobo
bankNameSnapshot
accountNumberSnapshot
accountNameSnapshot
status
failureReason
processedAt
createdAt
updatedAt
```

Recommended constraints:

```txt id="3t900h"
batchId index
sellerProfileId index
sellerWalletId index
status index
createdAt index
```

Rules:

* Use bank account snapshots so historical payouts remain auditable even if a seller later changes bank details.
* Failed payouts should not lose seller funds.
* Successful payouts should create seller wallet debit ledger entries.

---

### PlatformSetting

Represents configurable platform values.

Recommended fields:

```txt id="x9bdyy"
id
settingKey
settingValue
settingsGroup
valueType
description
updatedByAdminId
createdAt
updatedAt
```

Recommended constraints:

```txt id="qsibhe"
settingKey unique
settingsGroup index
updatedByAdminId index
```

Important settings may include:

```txt id="as6pvy"
SERVICE_FEE_PERCENTAGE
SERVICE_FEE_FLAT_KOBO
AUTO_RELEASE_DAYS
MAX_DISPATCH_DAYS
MIN_PAYOUT_AMOUNT_KOBO
SUPPORTED_CURRENCY
```

Rules:

* Changes to financial settings must create audit logs.
* Validate setting values before saving.

---

### AdminActivityLog

Represents sensitive admin/system actions.

Recommended fields:

```txt id="3uozpi"
id
actorUserId
actorRole
actionType
targetType
targetId
reason
metadata
createdAt
```

Recommended constraints:

```txt id="z341lj"
actorUserId index
actionType index
targetType index
targetId index
createdAt index
```

Rules:

* Admin actions affecting money, KYC, disputes, payouts, users, products, stores, or settings must create logs.
* Audit logs should be append-only.
* Do not delete audit logs.

---

## 8. Suggested Prisma Schema Skeleton

This is a reference skeleton, not necessarily the final full schema. Codex should inspect the real `prisma/schema.prisma` before applying changes.

```prisma id="m4398o"
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  BUYER
  SELLER
  ADMIN
}

enum AccountStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum KycStatus {
  NOT_SUBMITTED
  PENDING
  VERIFIED
  REJECTED
}

enum StoreStatus {
  PENDING_KYC
  ACTIVE
  SUSPENDED
  HIDDEN
}

enum ProductStatus {
  DRAFT
  LIVE
  HIDDEN
  OUT_OF_STOCK
  SUSPENDED
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  PARTIALLY_FULFILLED
  COMPLETED
  CANCELLED
  REFUNDED
}

enum OrderItemStatus {
  PENDING_PAYMENT
  FUNDED
  AWAITING_DISPATCH
  DISPATCHED
  DELIVERED
  CONFIRMED
  DISPUTED
  RELEASED
  REFUNDED
  CANCELLED
}

enum EscrowStatus {
  PENDING
  FUNDED
  HELD
  DISPUTED
  RELEASED
  REFUNDED
  CANCELLED
}

enum PaymentStatus {
  INITIATED
  PENDING
  SUCCESS
  FAILED
  CANCELLED
  EXPIRED
}

enum PaymentProvider {
  PAYSTACK
  FLUTTERWAVE
  MONNIFY
  BANK_TRANSFER
  MANUAL
}

enum DeliveryProvider {
  SELLER_MANAGED
  DELLYMAN
}

enum DeliveryMethod {
  SELLER_MANAGED
  THIRD_PARTY_PROVIDER
}

enum DeliveryStatus {
  PENDING
  QUOTE_REQUESTED
  QUOTE_ACCEPTED
  BOOKED
  PICKUP_PENDING
  PICKED_UP
  ARRIVED_AT_DESTINATION
  DELIVERED_ACCEPTED
  DELIVERED_REJECTED
  RETURN_PENDING
  RETURNED
  FAILED
  CANCELLED
}

enum WalletOwnerType {
  BUYER
  SELLER
  PLATFORM
}

enum LedgerDirection {
  CREDIT
  DEBIT
}

enum LedgerEntryType {
  BUYER_PAYMENT
  ESCROW_HOLD
  ESCROW_RELEASE
  REFUND
  PLATFORM_COMMISSION
  PAYOUT
  PAYOUT_REVERSAL
  MANUAL_ADJUSTMENT
}

enum DisputeStatus {
  OPEN
  UNDER_REVIEW
  AWAITING_BUYER_RETURN
  RETURN_IN_TRANSIT
  RESOLVED_BUYER_WON
  RESOLVED_SELLER_WON
  CANCELLED
}

enum PayoutBatchStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

enum PayoutRecordStatus {
  PENDING
  PROCESSING
  SUCCESS
  FAILED
  CANCELLED
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  passwordHash String?
  role         UserRole      @default(BUYER)
  status       AccountStatus @default(ACTIVE)
  phoneNumber  String?
  lastLoginAt  DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  buyerProfile  BuyerProfile?
  sellerProfiles SellerProfile[]

  @@index([role])
  @@index([status])
  @@index([phoneNumber])
}

model BuyerProfile {
  id          String        @id @default(uuid())
  userId      String        @unique
  walletId    String?       @unique
  fullName    String
  phoneNumber String?
  status      AccountStatus @default(ACTIVE)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  user      User           @relation(fields: [userId], references: [id])
  wallet    Wallet?
  addresses BuyerAddress[]
  orders    Order[]
  deliveryQuotes DeliveryQuote[]
  reviews   ProductReview[]

  @@index([status])
}

model SellerProfile {
  id                 String      @id @default(uuid())
  userId             String
  walletId           String?     @unique
  businessCategoryId String?
  username           String?
  businessName       String
  storeHandle        String      @unique
  storeUrl           String?     @unique
  baseLocation       String?
  bankName           String?
  accountNumber      String?
  accountName        String?
  kycStatus          KycStatus   @default(NOT_SUBMITTED)
  status             StoreStatus @default(PENDING_KYC)
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  user             User              @relation(fields: [userId], references: [id])
  wallet           Wallet?
  businessCategory BusinessCategory? @relation(fields: [businessCategoryId], references: [id])
  products         Product[]
  shippingSettings SellerShippingSetting[]
  kycDocuments     KycDocument[]
  orderItems       OrderItem[]
  payoutRecords    PayoutRecord[]

  @@index([userId])
  @@index([businessCategoryId])
  @@index([kycStatus])
  @@index([status])
}

model Wallet {
  id                       String          @id @default(uuid())
  ownerType                WalletOwnerType
  buyerProfileId           String?         @unique
  sellerProfileId          String?         @unique
  platformEntityId         String?         @unique
  availableBalanceKobo     BigInt          @default(0)
  escrowBalanceKobo        BigInt          @default(0)
  pendingPayoutBalanceKobo BigInt          @default(0)
  payoutPinHash            String?
  status                   AccountStatus   @default(ACTIVE)
  createdAt                DateTime        @default(now())
  updatedAt                DateTime        @updatedAt

  buyerProfile   BuyerProfile?   @relation(fields: [buyerProfileId], references: [id])
  sellerProfile  SellerProfile?  @relation(fields: [sellerProfileId], references: [id])
  platformEntity PlatformEntity? @relation(fields: [platformEntityId], references: [id])
  ledgerEntries  WalletLedgerEntry[]

  @@index([ownerType])
  @@index([status])
}

model WalletLedgerEntry {
  id                    String          @id @default(uuid())
  walletId              String
  direction             LedgerDirection
  entryType             LedgerEntryType
  amountKobo            BigInt
  balanceBeforeKobo     BigInt
  balanceAfterKobo      BigInt
  reference             String?
  relatedOrderId        String?
  relatedOrderItemId    String?
  relatedEscrowId       String?
  relatedPaymentId      String?
  relatedPayoutRecordId String?
  narration             String?
  metadata              Json?
  createdAt             DateTime        @default(now())

  wallet Wallet @relation(fields: [walletId], references: [id])

  @@index([walletId])
  @@index([direction])
  @@index([entryType])
  @@index([relatedOrderId])
  @@index([relatedOrderItemId])
  @@index([relatedPaymentId])
  @@index([createdAt])
}

model PlatformEntity {
  id                     String   @id @default(uuid())
  organizationName       String
  corporateBankName      String?
  corporateAccountNumber String?
  corporateAccountName   String?
  walletId               String?  @unique
  lastAuditAt            DateTime?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  wallet Wallet?
}

model BusinessCategory {
  id          String           @id @default(uuid())
  name        String           @unique
  description String?
  status      VisibilityStatus @default(ACTIVE)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  sellerProfiles SellerProfile[]
}

enum VisibilityStatus {
  ACTIVE
  HIDDEN
}

model Category {
  id               String           @id @default(uuid())
  name             String
  slug             String           @unique
  parentCategoryId String?
  level            Int
  description      String?
  status           VisibilityStatus @default(ACTIVE)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  parent   Category?  @relation("CategoryHierarchy", fields: [parentCategoryId], references: [id])
  children Category[] @relation("CategoryHierarchy")
  products ProductCategory[]

  @@index([parentCategoryId])
  @@index([level])
  @@index([status])
}

model Product {
  id              String        @id @default(uuid())
  sellerProfileId String
  title           String
  slug            String
  description     String?
  priceKobo       BigInt
  stockQuantity   Int           @default(0)
  status          ProductStatus @default(DRAFT)
  viewCount       BigInt        @default(0)
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  sellerProfile SellerProfile @relation(fields: [sellerProfileId], references: [id])
  images        ProductImage[]
  attributes    ProductAttribute[]
  categories    ProductCategory[]
  orderItems    OrderItem[]
  reviews       ProductReview[]

  @@unique([sellerProfileId, slug])
  @@index([sellerProfileId])
  @@index([status])
  @@index([isActive])
  @@index([createdAt])
}

model ProductImage {
  id         String   @id @default(uuid())
  productId  String
  imageUrl   String
  storageKey String?
  isPrimary  Boolean  @default(false)
  sortOrder  Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id])

  @@index([productId])
  @@index([isPrimary])
}

model ProductAttribute {
  id              String   @id @default(uuid())
  productId       String
  attributeName   String
  attributeValue  String
  stockQuantity   Int      @default(0)
  priceAddonKobo  BigInt   @default(0)
  isAvailable     Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id])

  @@index([productId])
  @@index([attributeName])
}

model ProductCategory {
  id         String   @id @default(uuid())
  productId  String
  categoryId String
  createdAt  DateTime @default(now())

  product  Product  @relation(fields: [productId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@unique([productId, categoryId])
  @@index([productId])
  @@index([categoryId])
}

model SellerShippingSetting {
  id                 String   @id @default(uuid())
  sellerProfileId    String
  destinationState   String
  shippingPriceKobo  BigInt
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  sellerProfile SellerProfile @relation(fields: [sellerProfileId], references: [id])

  @@unique([sellerProfileId, destinationState])
  @@index([sellerProfileId])
  @@index([destinationState])
}

model Order {
  id                     String      @id @default(uuid())
  buyerProfileId          String
  orderReference          String      @unique
  status                  OrderStatus @default(PENDING_PAYMENT)
  totalProductAmountKobo  BigInt
  totalShippingFeeKobo    BigInt
  totalServiceFeeKobo     BigInt
  totalOrderAmountKobo    BigInt
  createdAt               DateTime    @default(now())
  updatedAt               DateTime    @updatedAt
  cancelledAt             DateTime?
  completedAt             DateTime?

  buyerProfile BuyerProfile @relation(fields: [buyerProfileId], references: [id])
  items        OrderItem[]
  payments     Payment[]

  @@index([buyerProfileId])
  @@index([status])
  @@index([createdAt])
}

model OrderItem {
  id                       String          @id @default(uuid())
  orderId                  String
  productId                String
  sellerProfileId          String
  quantity                 Int
  unitPriceAtCheckoutKobo  BigInt
  productAmountKobo        BigInt
  shippingFeeKobo          BigInt
  serviceFeeKobo           BigInt
  netEscrowAmountKobo      BigInt
  status                   OrderItemStatus @default(PENDING_PAYMENT)
  deliveryHandledBy        String?
  safetyTimerExpiresAt     DateTime?
  dispatchedAt             DateTime?
  deliveredAt              DateTime?
  confirmedAt              DateTime?
  releasedAt               DateTime?
  refundedAt               DateTime?
  cancelledAt              DateTime?
  createdAt                DateTime        @default(now())
  updatedAt                DateTime        @updatedAt

  order         Order             @relation(fields: [orderId], references: [id])
  product       Product           @relation(fields: [productId], references: [id])
  sellerProfile SellerProfile     @relation(fields: [sellerProfileId], references: [id])
  escrow        EscrowTransaction?
  deliveryShipment DeliveryShipment?
  dispatchEvidence DispatchEvidence[]
  deliveryOtp   DeliveryOtp?
  disputes      Dispute[]
  reviews       ProductReview?

  @@index([orderId])
  @@index([productId])
  @@index([sellerProfileId])
  @@index([status])
  @@index([safetyTimerExpiresAt])
  @@index([createdAt])
}

model DeliveryQuote {
  id                       String           @id @default(uuid())
  buyerProfileId            String
  provider                 DeliveryProvider
  pickupState              String?
  pickupAddress            String?
  dropoffState             String
  dropoffAddress           String
  quotedFeeKobo            BigInt
  estimatedPickupAt        DateTime?
  estimatedDeliveryAt      DateTime?
  providerQuoteReference   String?
  expiresAt                DateTime?
  metadata                 Json?
  createdAt                DateTime         @default(now())

  buyerProfile BuyerProfile @relation(fields: [buyerProfileId], references: [id])

  @@index([buyerProfileId])
  @@index([provider])
  @@index([providerQuoteReference])
  @@index([expiresAt])
}

model DeliveryShipment {
  id                          String           @id @default(uuid())
  orderItemId                  String           @unique
  provider                    DeliveryProvider
  method                      DeliveryMethod
  status                      DeliveryStatus   @default(PENDING)
  providerShipmentReference   String?
  trackingReference           String?
  deliveryFeeKobo             BigInt
  pickupAddressSnapshot       Json?
  dropoffAddressSnapshot      Json?
  readyForPickupAt            DateTime?
  bookedAt                    DateTime?
  pickedUpAt                  DateTime?
  arrivedAtDestinationAt      DateTime?
  acceptedAt                  DateTime?
  rejectedAt                  DateTime?
  returnedAt                  DateTime?
  failedAt                    DateTime?
  cancelledAt                 DateTime?
  metadata                    Json?
  createdAt                   DateTime         @default(now())
  updatedAt                   DateTime         @updatedAt

  orderItem OrderItem       @relation(fields: [orderItemId], references: [id])
  events    DeliveryEvent[]

  @@index([provider])
  @@index([method])
  @@index([status])
  @@index([providerShipmentReference])
  @@index([trackingReference])
  @@index([readyForPickupAt])
  @@index([createdAt])
}

model DeliveryEvent {
  id                  String           @id @default(uuid())
  deliveryShipmentId  String
  provider            DeliveryProvider
  providerEventId     String?
  providerStatus      String?
  internalStatus      DeliveryStatus?
  occurredAt          DateTime?
  payload             Json?
  createdAt           DateTime         @default(now())

  deliveryShipment DeliveryShipment @relation(fields: [deliveryShipmentId], references: [id])

  @@index([deliveryShipmentId])
  @@index([provider])
  @@index([providerEventId])
  @@index([internalStatus])
  @@index([occurredAt])
  @@unique([provider, providerEventId])
}

model Payment {
  id                String          @id @default(uuid())
  orderId           String
  buyerProfileId    String
  provider          PaymentProvider
  providerReference String?         @unique
  internalReference String          @unique
  status            PaymentStatus   @default(INITIATED)
  amountKobo        BigInt
  currency          String          @default("NGN")
  providerPayload   Json?
  verifiedAt        DateTime?
  failedAt          DateTime?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  order        Order        @relation(fields: [orderId], references: [id])
  buyerProfile BuyerProfile @relation(fields: [buyerProfileId], references: [id])
  escrows      EscrowTransaction[]

  @@index([orderId])
  @@index([buyerProfileId])
  @@index([status])
  @@index([provider])
  @@index([createdAt])
}

model EscrowTransaction {
  id                   String       @id @default(uuid())
  orderItemId          String       @unique
  sellerProfileId      String
  buyerProfileId       String
  paymentId            String?
  escrowReference      String       @unique
  status               EscrowStatus @default(PENDING)
  grossAmountKobo      BigInt
  sellerNetAmountKobo  BigInt
  platformFeeKobo      BigInt
  shippingFeeKobo      BigInt
  heldAt               DateTime?
  disputedAt           DateTime?
  releasedAt           DateTime?
  refundedAt           DateTime?
  cancelledAt          DateTime?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  orderItem     OrderItem     @relation(fields: [orderItemId], references: [id])
  sellerProfile SellerProfile @relation(fields: [sellerProfileId], references: [id])
  buyerProfile  BuyerProfile  @relation(fields: [buyerProfileId], references: [id])
  payment       Payment?      @relation(fields: [paymentId], references: [id])

  @@index([sellerProfileId])
  @@index([buyerProfileId])
  @@index([paymentId])
  @@index([status])
  @@index([createdAt])
}

model DispatchEvidence {
  id                String   @id @default(uuid())
  orderItemId        String
  sellerProfileId    String
  evidenceType       String?
  imageUrl           String?
  storageKey         String?
  trackingReference  String?
  courierName        String?
  notes              String?
  uploadedAt         DateTime @default(now())
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  orderItem     OrderItem     @relation(fields: [orderItemId], references: [id])
  sellerProfile SellerProfile @relation(fields: [sellerProfileId], references: [id])

  @@index([orderItemId])
  @@index([sellerProfileId])
  @@index([trackingReference])
  @@index([uploadedAt])
}

model DeliveryOtp {
  id          String    @id @default(uuid())
  orderItemId String    @unique
  otpHash     String
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  orderItem OrderItem @relation(fields: [orderItemId], references: [id])

  @@index([expiresAt])
  @@index([usedAt])
}

model Dispute {
  id                    String        @id @default(uuid())
  orderItemId            String
  raisedByUserId         String
  buyerProfileId         String
  sellerProfileId        String
  status                 DisputeStatus @default(OPEN)
  reason                 String
  evidenceImageUrl       String?
  evidenceStorageKey     String?
  returnWaybillImageUrl  String?
  returnStorageKey       String?
  returnStatus           String?
  adminResolutionReason  String?
  resolvedByAdminId      String?
  resolvedAt             DateTime?
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  orderItem     OrderItem     @relation(fields: [orderItemId], references: [id])
  buyerProfile  BuyerProfile  @relation(fields: [buyerProfileId], references: [id])
  sellerProfile SellerProfile @relation(fields: [sellerProfileId], references: [id])

  @@index([orderItemId])
  @@index([buyerProfileId])
  @@index([sellerProfileId])
  @@index([status])
  @@index([resolvedByAdminId])
  @@index([createdAt])
}

model DisputeMessage {
  id                   String   @id @default(uuid())
  disputeId             String
  senderUserId          String
  message               String
  attachmentUrl         String?
  attachmentStorageKey  String?
  createdAt             DateTime @default(now())

  @@index([disputeId])
  @@index([senderUserId])
  @@index([createdAt])
}

model ProductReview {
  id             String   @id @default(uuid())
  productId       String
  buyerProfileId  String
  orderItemId     String   @unique
  rating          Int
  comment         String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product      Product      @relation(fields: [productId], references: [id])
  buyerProfile BuyerProfile @relation(fields: [buyerProfileId], references: [id])
  orderItem    OrderItem    @relation(fields: [orderItemId], references: [id])

  @@index([productId])
  @@index([buyerProfileId])
  @@index([rating])
  @@index([createdAt])
}

model BuyerAddress {
  id              String   @id @default(uuid())
  buyerProfileId  String
  contactName     String
  phoneNumber     String?
  state           String
  streetAddress   String
  isDefault       Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  buyerProfile BuyerProfile @relation(fields: [buyerProfileId], references: [id])

  @@index([buyerProfileId])
  @@index([state])
  @@index([isDefault])
}

model SupportTicket {
  id        String              @id @default(uuid())
  userId    String
  subject   String
  message   String
  status    SupportTicketStatus @default(OPEN)
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt
  closedAt  DateTime?

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

enum SupportTicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

model KycDocument {
  id                String     @id @default(uuid())
  sellerProfileId   String
  documentType      DocumentType
  documentNumber    String
  documentImageUrl  String
  status            KycStatus  @default(PENDING)
  rejectionReason   String?
  reviewedByAdminId String?
  reviewedAt        DateTime?
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  sellerProfile SellerProfile @relation(fields: [sellerProfileId], references: [id])

  @@index([sellerProfileId])
  @@index([documentType])
  @@index([status])
}

enum DocumentType {
  NIN
  BVN
  DRIVERS_LICENSE
  VOTERS_CARD
  CAC
}

model PayoutBatch {
  id                 String            @id @default(uuid())
  batchReference     String            @unique
  status             PayoutBatchStatus @default(PENDING)
  totalAmountKobo    BigInt
  sellerCount        Int
  generatedByAdminId String?
  generatedAt        DateTime          @default(now())
  settledAt          DateTime?
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt

  records PayoutRecord[]

  @@index([status])
  @@index([generatedAt])
  @@index([generatedByAdminId])
}

model PayoutRecord {
  id                    String             @id @default(uuid())
  batchId                String
  sellerProfileId        String
  sellerWalletId         String
  amountKobo             BigInt
  bankNameSnapshot       String
  accountNumberSnapshot  String
  accountNameSnapshot    String
  status                 PayoutRecordStatus @default(PENDING)
  failureReason          String?
  processedAt            DateTime?
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt

  batch         PayoutBatch   @relation(fields: [batchId], references: [id])
  sellerProfile SellerProfile @relation(fields: [sellerProfileId], references: [id])

  @@index([batchId])
  @@index([sellerProfileId])
  @@index([sellerWalletId])
  @@index([status])
  @@index([createdAt])
}

model PlatformSetting {
  id               String   @id @default(uuid())
  settingKey        String   @unique
  settingValue      String
  settingsGroup     String
  valueType         String
  description       String?
  updatedByAdminId  String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([settingsGroup])
  @@index([updatedByAdminId])
}

model AdminActivityLog {
  id          String   @id @default(uuid())
  actorUserId String?
  actorRole   String?
  actionType  String
  targetType  String
  targetId    String?
  reason      String?
  metadata    Json?
  createdAt   DateTime @default(now())

  @@index([actorUserId])
  @@index([actionType])
  @@index([targetType])
  @@index([targetId])
  @@index([createdAt])
}
```

---

## 9. Relationship Summary

## 9.1 User Relationships

```txt id="quya16"
User 1 -> 0/1 BuyerProfile
User 1 -> many SellerProfiles
User 1 -> many AdminActivityLogs as actor
```

A user may be a buyer and also own seller profiles.

---

## 9.2 Seller Relationships

```txt id="qnkdtm"
SellerProfile 1 -> 1 Wallet
SellerProfile 1 -> many Products
SellerProfile 1 -> many KycDocuments
SellerProfile 1 -> many OrderItems
SellerProfile 1 -> many PayoutRecords
SellerProfile many -> 1 BusinessCategory
```

---

## 9.3 Buyer Relationships

```txt id="6r58dw"
BuyerProfile 1 -> 1 Wallet
BuyerProfile 1 -> many BuyerAddresses
BuyerProfile 1 -> many Orders
BuyerProfile 1 -> many ProductReviews
```

---

## 9.4 Order and Escrow Relationships

```txt id="f09hm4"
Order 1 -> many OrderItems
Order 1 -> many Payments
OrderItem 1 -> 1 EscrowTransaction
OrderItem 1 -> 0/1 DeliveryShipment
DeliveryShipment 1 -> many DeliveryEvents
OrderItem 1 -> many DispatchEvidence
OrderItem 1 -> 0/1 DeliveryOtp
OrderItem 1 -> many Disputes
```

---

## 9.5 Wallet Relationships

```txt id="adni2g"
Wallet 1 -> many WalletLedgerEntries
BuyerProfile 1 -> 1 Wallet
SellerProfile 1 -> 1 Wallet
PlatformEntity 1 -> 1 Wallet
```

---

## 10. Important Constraints

Codex should preserve or implement these constraints.

## 10.1 Uniqueness

Recommended unique constraints:

```txt id="4c3wg3"
User.email
SellerProfile.storeHandle
SellerProfile.storeUrl
BuyerProfile.userId
Wallet.buyerProfileId
Wallet.sellerProfileId
Wallet.platformEntityId
Payment.internalReference
Payment.providerReference
Order.orderReference
EscrowTransaction.orderItemId
EscrowTransaction.escrowReference
DeliveryOtp.orderItemId
DeliveryShipment.orderItemId
DeliveryEvent.provider + providerEventId where provider supplies stable event IDs
Product.sellerProfileId + Product.slug
ProductCategory.productId + ProductCategory.categoryId
SellerShippingSetting.sellerProfileId + SellerShippingSetting.destinationState
ProductReview.orderItemId
PayoutBatch.batchReference
PlatformSetting.settingKey
```

---

## 10.2 Indexes

Frequently queried fields should be indexed.

Important indexes:

```txt id="6t620a"
status fields
createdAt fields
userId fields
buyerProfileId fields
sellerProfileId fields
orderId fields
orderItemId fields
payment references
escrow references
payout batch references
delivery shipment references
delivery provider event references
safetyTimerExpiresAt
storeHandle
product slug
category slug
```

---

## 10.3 Soft Delete

Use soft delete for records where historical integrity matters.

Recommended soft-delete fields:

```txt id="jk39mn"
Product.deletedAt
SellerProfile.status
Category.status
BusinessCategory.status
User.status
```

Do not physically delete:

```txt id="jit9cc"
Orders
OrderItems
Payments
EscrowTransactions
DeliveryShipments
DeliveryEvents
Wallets
WalletLedgerEntries
Disputes
PayoutBatches
PayoutRecords
AdminActivityLogs
```

Financial history must remain intact.

---

## 11. Database Transaction Requirements

Use Prisma transactions for operations that change multiple related records.

Required transaction flows:

```txt id="llieoc"
Payment success processing
Order initialization
Delivery booking after seller readiness
Provider delivery webhook processing where order item state changes
Creating escrow records
Holding escrow funds
Releasing escrow to seller
Refunding buyer
Buyer delivery acceptance
Buyer delivery rejection and return initiation
Opening a dispute
Resolving a dispute
Generating payout batches
Marking payout success
Manual admin adjustments
```

Example release transaction:

```txt id="p7r3qp"
1. Validate order item status
2. Validate escrow status
3. Debit escrow/system wallet
4. Credit seller wallet
5. Credit platform wallet with commission
6. Create ledger entries
7. Update escrow status
8. Update order item status
9. Update parent order derived status
10. Create audit log if needed
```

---

## 12. Data Access Rules

Use Prisma `select` to prevent leaking sensitive fields.

Never return:

```txt id="ytgqts"
passwordHash
refreshTokenHash
otpHash
payoutPinHash
documentNumber
private KYC image URLs
payment provider secrets
full bank verification metadata
```

Bank details should only be visible to the seller owner and authorized admins.

KYC documents should only be visible to seller owner and authorized admins.

Wallet ledger should only be visible to the wallet owner and authorized admins.

---

## 13. Schema Evolution Rules

When Codex changes the Prisma schema:

1. Inspect current `prisma/schema.prisma`.
2. Compare with this document.
3. Make the smallest compatible change.
4. Run or recommend `npx prisma format`.
5. Run or recommend `npx prisma generate`.
6. Create a migration with `npx prisma migrate dev`.
7. Do not create destructive migrations without warning.
8. Explain any breaking changes.

---

## 14. MVP Database Scope

For the first MVP implementation, prioritize these models:

```txt id="g10cr5"
User
BuyerProfile
SellerProfile
Wallet
WalletLedgerEntry
BusinessCategory
Category
Product
ProductImage
Order
OrderItem
DeliveryQuote
DeliveryShipment
DeliveryEvent
Payment
EscrowTransaction
DispatchEvidence
Dispute
KycDocument
PayoutBatch
PayoutRecord
PlatformSetting
AdminActivityLog
```

Optional for later:

```txt id="hthjcd"
ProductAttribute
ProductCategory
SellerShippingSetting
DeliveryOtp
DisputeMessage
ProductReview
SupportTicket
PlatformEntity
```

However, if platform commission needs proper accounting from the beginning, include `PlatformEntity` and platform wallet early.

---

## 15. Implementation Notes for Codex

When implementing database changes:

1. Read `AGENTS.md`.
2. Read `docs/PRODUCT_BRIEF.md`.
3. Read `docs/ESCROW_STATE_MACHINE.md`.
4. Read this document.
5. Inspect existing `prisma/schema.prisma`.
6. Preserve existing conventions unless they are unsafe.
7. Use kobo integer fields for money.
8. Use enums for statuses.
9. Add indexes and unique constraints.
10. Use Prisma migrations.
11. Do not delete financial records.
12. Do not expose sensitive fields.
13. Add tests for any service that depends on new models.
14. Update seed data if needed.
15. Mention migration commands in the final summary.

---

## 16. Final Rule

If the existing schema conflicts with this document, do not blindly replace it.

First identify:

1. The conflict.
2. The business risk.
3. The safest migration path.
4. Whether data loss could occur.

Then propose the change before applying it.
