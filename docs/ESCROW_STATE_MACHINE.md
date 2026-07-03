# ESCROW_STATE_MACHINE.md

## 1. Purpose

This document defines the escrow, order item, wallet, dispute, and payout state machine for Escrova.

Escrova is an escrow-based peer-to-peer marketplace. The system must protect both buyers and sellers by ensuring that money only moves when the correct business conditions are met.

This document exists to prevent unsafe or arbitrary state changes in the codebase.

Escrow, wallet, order, dispute, payment, and payout workflows must be implemented as strict state machines.

---

## 2. Core Rule

Escrow is not CRUD.

Do not implement generic status update methods for financial workflows.

Do not create endpoints such as:

```txt
PATCH /escrow/:id/status
PATCH /orders/:id/status
PATCH /wallets/:id/balance
```

Instead, use explicit business actions such as:

```txt
confirmPayment
markOrderItemDispatched
confirmDelivery
openDispute
resolveDisputeForBuyer
resolveDisputeForSeller
releaseFundsToSeller
refundBuyer
generatePayoutBatch
```

Each action must validate:

1. The current state.
2. The authenticated actor.
3. The target resource ownership.
4. The allowed transition.
5. The required evidence or payment confirmation.
6. The wallet and ledger impact.
7. The audit log requirement.

---

## 3. Key Concepts

## 3.1 Parent Order

A parent order represents the buyer’s checkout.

A single order may contain one or many order items.

A buyer may pay once for multiple products, including products from different sellers.

The parent order tracks the overall checkout state.

## 3.2 Order Item

An order item represents one purchased product line in an order.

Escrova tracks fulfilment, escrow, dispatch evidence, buyer confirmation, dispute, and release at the **Order Item** level.

This is important because one order item may be disputed while other order items in the same parent order are completed normally.

## 3.3 Escrow Record

An escrow record represents money being held for a specific order item.

Each order item should have its own escrow record or a clearly traceable escrow allocation.

The escrow amount should represent the seller’s receivable amount for that order item, after any platform rules are applied.

## 3.4 Digital Handshake

The Digital Handshake is the buyer’s confirmation that the item was received and accepted.

It may happen through:

* Buyer clicking “Confirm Delivery”.
* Buyer providing a delivery OTP.
* Auto-release after the safety timer expires without a dispute.
* Admin resolution in favour of the seller.

## 3.5 Dispute Lock

A dispute lock freezes the affected order item’s escrow funds.

A dispute must not automatically freeze unrelated order items in the same parent order.

## 3.6 Wallet

Wallets track balances for buyers, seller storefronts, and the platform.

A seller store should have its own wallet.

A buyer may have a wallet for refunds and reusable balance.

The platform should have a wallet or platform entity for commission and revenue tracking.

## 3.7 Ledger

Every money movement must create a ledger or transaction record.

Do not mutate balances without a corresponding ledger entry.

---

## 4. Recommended Enums

The final enum names may be adjusted to match codebase naming conventions, but the meaning must remain consistent.

## 4.1 Parent Order Status

```ts
enum OrderStatus {
  PENDING_PAYMENT
  PAID
  PARTIALLY_FULFILLED
  COMPLETED
  CANCELLED
  REFUNDED
}
```

### Meaning

| Status                | Meaning                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| `PENDING_PAYMENT`     | Order has been created but payment has not been confirmed.                 |
| `PAID`                | Buyer payment has been confirmed and order items are funded in escrow.     |
| `PARTIALLY_FULFILLED` | Some order items have progressed, but the full order is not completed.     |
| `COMPLETED`           | All order items are released, refunded, cancelled, or otherwise closed.    |
| `CANCELLED`           | Order was cancelled before successful payment or before escrow activation. |
| `REFUNDED`            | Entire order was refunded where business rules allow.                      |

---

## 4.2 Order Item Status

```ts
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
```

### Meaning

| Status              | Meaning                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `PENDING_PAYMENT`   | Item exists but buyer payment has not been confirmed.                   |
| `FUNDED`            | Payment for this item has been confirmed and escrow has been funded.    |
| `AWAITING_DISPATCH` | Seller may prepare the item and mark it ready for pickup or dispatch.   |
| `DISPATCHED`        | Item has been picked up or dispatched with required evidence.           |
| `DELIVERED`         | Delivery has reached the buyer, but buyer acceptance is still pending.  |
| `CONFIRMED`         | Buyer has accepted delivery through the Digital Handshake.              |
| `DISPUTED`          | Buyer has opened a dispute and funds are locked.                        |
| `RELEASED`          | Funds have been released to seller wallet.                              |
| `REFUNDED`          | Funds have been refunded to buyer wallet or approved refund route.      |
| `CANCELLED`         | Item was cancelled before fulfilment.                                   |

Delivery provider movement should be tracked on `DeliveryShipment` and append-only `DeliveryEvent` records. Do not overload `OrderItemStatus` with every provider state such as rider assigned, in transit, or arrived.

Provider delivery status is evidence only. It must never release escrow by itself.

---

## 4.3 Delivery Shipment Status

```ts
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
```

### Meaning

| Status                    | Meaning                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `PENDING`                 | Delivery record exists but no provider booking has been made.           |
| `QUOTE_REQUESTED`         | Delivery fee quote has been requested from a provider.                  |
| `QUOTE_ACCEPTED`          | Quote has been selected for checkout/payment calculation.               |
| `BOOKED`                  | Delivery has been booked after payment verification and seller readiness. |
| `PICKUP_PENDING`          | Provider or seller-managed courier is expected to pick up the item.     |
| `PICKED_UP`               | Item has been picked up or dispatched.                                  |
| `ARRIVED_AT_DESTINATION`  | Provider indicates arrival at the buyer location, if supported.         |
| `DELIVERED_ACCEPTED`      | Buyer accepted the item through Escrova confirmation.                   |
| `DELIVERED_REJECTED`      | Buyer rejected the item through Escrova confirmation.                   |
| `RETURN_PENDING`          | Return is required after rejection or dispute handling.                 |
| `RETURNED`                | Item has been returned or return was resolved.                          |
| `FAILED`                  | Delivery failed and requires review or rebooking.                       |
| `CANCELLED`               | Delivery booking was cancelled.                                         |

`DELIVERED_REJECTED` and `RETURN_PENDING` are separate states. Rejection records the buyer outcome; return pending records the operational next step.

For MVP, `IN_TRANSIT` does not need to be a first-class internal status. Provider-specific movement statuses can be stored as `DeliveryEvent.providerStatus`.

---

## 4.4 Escrow Status

```ts
enum EscrowStatus {
  PENDING
  FUNDED
  HELD
  DISPUTED
  RELEASED
  REFUNDED
  CANCELLED
}
```

### Meaning

| Status      | Meaning                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| `PENDING`   | Escrow record exists but payment has not been confirmed.                 |
| `FUNDED`    | Payment is confirmed and escrow value is allocated.                      |
| `HELD`      | Funds are actively held pending dispatch, confirmation, or timer expiry. |
| `DISPUTED`  | Funds are frozen due to a dispute.                                       |
| `RELEASED`  | Funds have been released to seller wallet.                               |
| `REFUNDED`  | Funds have been returned to buyer wallet or approved route.              |
| `CANCELLED` | Escrow was cancelled before funding or fulfilment.                       |

---

## 4.5 Payment Status

```ts
enum PaymentStatus {
  INITIATED
  PENDING
  SUCCESS
  FAILED
  CANCELLED
  EXPIRED
}
```

### Meaning

| Status      | Meaning                                              |
| ----------- | ---------------------------------------------------- |
| `INITIATED` | Payment attempt has been created.                    |
| `PENDING`   | Payment is awaiting provider confirmation.           |
| `SUCCESS`   | Payment has been verified server-side.               |
| `FAILED`    | Payment failed.                                      |
| `CANCELLED` | Payment was cancelled.                               |
| `EXPIRED`   | Payment was not completed within the allowed period. |

Never mark a payment as `SUCCESS` based only on frontend confirmation.

---

## 4.6 Dispute Status

```ts
enum DisputeStatus {
  OPEN
  UNDER_REVIEW
  AWAITING_BUYER_RETURN
  RETURN_IN_TRANSIT
  RESOLVED_BUYER_WON
  RESOLVED_SELLER_WON
  CANCELLED
}
```

### Meaning

| Status                  | Meaning                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `OPEN`                  | Buyer has opened a dispute.                                     |
| `UNDER_REVIEW`          | Admin is reviewing evidence.                                    |
| `AWAITING_BUYER_RETURN` | Buyer must return item before refund decision can be completed. |
| `RETURN_IN_TRANSIT`     | Buyer uploaded return waybill and return is in progress.        |
| `RESOLVED_BUYER_WON`    | Admin resolved dispute in buyer’s favour.                       |
| `RESOLVED_SELLER_WON`   | Admin resolved dispute in seller’s favour.                      |
| `CANCELLED`             | Dispute was cancelled or closed without action.                 |

---

## 4.7 Wallet Ledger Direction

```ts
enum LedgerDirection {
  CREDIT
  DEBIT
}
```

---

## 4.8 Wallet Ledger Type

```ts
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
```

Manual adjustment must be admin-only and must always require an audit log reason.

---

## 4.9 Payout Status

```ts
enum PayoutStatus {
  PENDING
  PROCESSING
  SUCCESS
  FAILED
  CANCELLED
}
```

---

## 5. Main Happy Path

This is the normal successful flow.

```txt
Order:      PENDING_PAYMENT -> PAID -> COMPLETED

OrderItem:  PENDING_PAYMENT
            -> FUNDED
            -> AWAITING_DISPATCH
            -> DISPATCHED
            -> CONFIRMED
            -> RELEASED

Escrow:     PENDING
            -> FUNDED
            -> HELD
            -> RELEASED
```

### Step-by-step

1. Buyer creates an order.
2. System creates order items.
3. System creates payment attempt.
4. Buyer pays through payment provider.
5. Server verifies payment.
6. Parent order becomes `PAID`.
7. Each order item becomes `FUNDED` or `AWAITING_DISPATCH`.
8. Escrow records become `FUNDED` and then `HELD`.
9. Seller marks the item as ready for pickup or seller-managed dispatch.
10. Escrova books provider delivery where available, or records seller-managed delivery.
11. Provider or seller-managed courier picks up/dispatches the item.
12. Order item becomes `DISPATCHED`.
13. Safety timer starts after dispatch/pickup evidence exists.
14. Buyer inspects the item at delivery.
15. Buyer accepts delivery through button, OTP, QR/token confirmation, or another approved Escrova confirmation method.
16. Order item becomes `CONFIRMED`.
17. Escrow releases funds to seller wallet.
18. Platform commission is recorded.
19. Order item becomes `RELEASED`.
20. Parent order becomes `COMPLETED` when all items are closed.

---

## 6. Allowed State Transitions

## 6.1 Parent Order Transitions

| From                  | To                    | Trigger                                          | Actor        |
| --------------------- | --------------------- | ------------------------------------------------ | ------------ |
| `PENDING_PAYMENT`     | `PAID`                | Payment verified server-side                     | System       |
| `PENDING_PAYMENT`     | `CANCELLED`           | Payment expired or buyer cancels before payment  | Buyer/System |
| `PAID`                | `PARTIALLY_FULFILLED` | At least one item progresses beyond funded state | System       |
| `PAID`                | `COMPLETED`           | All order items are closed                       | System       |
| `PARTIALLY_FULFILLED` | `COMPLETED`           | All order items are closed                       | System       |
| `PAID`                | `REFUNDED`            | All items refunded                               | System/Admin |
| `PARTIALLY_FULFILLED` | `REFUNDED`            | All remaining releasable items refunded          | System/Admin |

Parent order status should usually be derived from order item statuses instead of manually mutated.

---

## 6.2 Order Item Transitions

| From                | To                  | Trigger                                        | Actor               |
| ------------------- | ------------------- | ---------------------------------------------- | ------------------- |
| `PENDING_PAYMENT`   | `FUNDED`            | Payment verified                               | System              |
| `FUNDED`            | `AWAITING_DISPATCH` | Escrow allocation created                      | System              |
| `AWAITING_DISPATCH` | `DISPATCHED`        | Provider pickup or seller-managed dispatch evidence exists | Seller/System |
| `DISPATCHED`        | `DELIVERED`         | Delivery arrival marked if supported           | System              |
| `DISPATCHED`        | `CONFIRMED`         | Buyer confirms receipt                         | Buyer               |
| `DELIVERED`         | `CONFIRMED`         | Buyer confirms receipt                         | Buyer               |
| `DISPATCHED`        | `DISPUTED`          | Buyer opens dispute                            | Buyer               |
| `DELIVERED`         | `DISPUTED`          | Buyer opens dispute                            | Buyer               |
| `CONFIRMED`         | `RELEASED`          | Escrow release succeeds                        | System              |
| `DISPATCHED`        | `RELEASED`          | Auto-release timer expires without dispute     | System              |
| `DELIVERED`         | `RELEASED`          | Auto-release timer expires without dispute     | System              |
| `DISPUTED`          | `RELEASED`          | Admin resolves for seller                      | Admin/System        |
| `DISPUTED`          | `REFUNDED`          | Admin resolves for buyer                       | Admin/System        |
| `PENDING_PAYMENT`   | `CANCELLED`         | Order cancelled before payment                 | Buyer/System        |
| `FUNDED`            | `REFUNDED`          | Valid cancellation/refund before dispatch      | Admin/System        |
| `AWAITING_DISPATCH` | `REFUNDED`          | Seller fails to dispatch within allowed period | Admin/System        |

Seller readiness should be captured on the delivery/shipment record, for example `readyForPickupAt`, instead of creating a separate `OrderItemStatus` for every preparation step.

Provider events may update `DeliveryShipment.status` and append `DeliveryEvent` records. They must not directly move an order item to `CONFIRMED`, `RELEASED`, or `REFUNDED`.

---

## 6.3 Escrow Transitions

| From       | To          | Trigger                              | Actor        |
| ---------- | ----------- | ------------------------------------ | ------------ |
| `PENDING`  | `FUNDED`    | Payment verified server-side         | System       |
| `FUNDED`   | `HELD`      | Escrow hold activated for order item | System       |
| `HELD`     | `DISPUTED`  | Buyer opens dispute                  | Buyer/System |
| `HELD`     | `RELEASED`  | Buyer confirms delivery              | Buyer/System |
| `HELD`     | `RELEASED`  | Auto-release timer expires           | System       |
| `DISPUTED` | `RELEASED`  | Admin resolves in seller’s favour    | Admin/System |
| `DISPUTED` | `REFUNDED`  | Admin resolves in buyer’s favour     | Admin/System |
| `PENDING`  | `CANCELLED` | Payment cancelled or expired         | System       |
| `FUNDED`   | `REFUNDED`  | Valid refund before dispatch         | Admin/System |
| `HELD`     | `REFUNDED`  | Valid refund before release          | Admin/System |

---

## 7. Forbidden Transitions

The following transitions must never be allowed:

| From              | To           | Reason                                                               |
| ----------------- | ------------ | -------------------------------------------------------------------- |
| `PENDING_PAYMENT` | `RELEASED`   | Payment was never confirmed.                                         |
| `PENDING_PAYMENT` | `DISPATCHED` | Seller cannot dispatch before payment confirmation.                  |
| `PENDING` escrow  | `RELEASED`   | Escrow was never funded.                                             |
| `DISPUTED`        | `CONFIRMED`  | Disputed items require admin resolution.                             |
| `REFUNDED`        | `RELEASED`   | Refunded funds cannot be released to seller.                         |
| `RELEASED`        | `REFUNDED`   | Released funds cannot be refunded without a new reversal process.    |
| `CANCELLED`       | `RELEASED`   | Cancelled items cannot release funds.                                |
| `RELEASED`        | `DISPUTED`   | Buyer cannot dispute after final release except via support process. |
| `REFUNDED`        | `DISPUTED`   | Refunded items are already closed.                                   |

If an operation needs to reverse a completed release or refund, it must be implemented as a separate admin-controlled adjustment flow with audit logs, not as a normal state transition.

---

## 8. Actor Permissions

## 8.1 Buyer Actions

Buyers may:

* Create orders.
* Pay for orders.
* View their own orders.
* Confirm delivery for their own order items.
* Reject delivery for their own order items when the delivered item is wrong, damaged, missing, or materially different.
* Open disputes for their own order items.
* Upload dispute evidence.
* Manage their own delivery addresses.
* View their own refund wallet.

Buyers must not:

* Confirm another buyer’s order item.
* Dispute another buyer’s order item.
* Release escrow directly.
* Modify escrow status directly.
* Modify wallet balances directly.

---

## 8.2 Seller Actions

Sellers may:

* View order items assigned to their own store.
* Mark their own paid order items as ready for pickup.
* Dispatch their own order items through seller-managed fallback flows after payment is confirmed.
* Upload waybill or dispatch evidence where provider delivery is unavailable or evidence is required.
* View escrow and wallet status for their own store.
* View payout records for their own store.

Sellers must not:

* Dispatch unpaid order items.
* Dispatch another seller’s order item.
* Book delivery for another seller’s order item.
* Confirm buyer delivery on behalf of the buyer unless OTP verification is used.
* Release their own funds manually.
* Modify escrow status directly.
* Modify wallet balances directly.
* Resolve disputes.

---

## 8.3 Admin Actions

Admins may:

* Review KYC.
* Review disputes.
* Resolve disputes.
* Generate payout batches.
* Mark payout records as successful or failed.
* Moderate products and stores.
* Manage platform settings.

Admins must not:

* Modify wallet balances without ledger records.
* Resolve disputes without audit logs.
* Change platform financial settings without audit logs.
* Delete financial records.

---

## 8.4 System Actions

The system may:

* Verify payment webhooks.
* Mark payments as successful.
* Create escrow holds.
* Start auto-release timers.
* Auto-release eligible escrow funds.
* Generate payout batches.
* Update derived parent order statuses.
* Send notifications.

System actions must be idempotent where retries are possible.

---

## 9. Required Business Methods

The codebase should use explicit service methods.

## 9.1 Payment Methods

```ts
initiatePayment(orderId: string, buyerId: string)
verifyPayment(reference: string)
handlePaymentWebhook(payload: unknown, signature: string)
markPaymentSuccessful(paymentId: string)
markPaymentFailed(paymentId: string)
```

Rules:

* `verifyPayment` must use server-side verification.
* Webhook handling must verify provider signatures.
* Payment success processing must be idempotent.
* Duplicate webhook events must not duplicate ledger entries.

---

## 9.2 Escrow Methods

```ts
createEscrowForOrderItem(orderItemId: string)
fundEscrow(orderItemId: string, paymentId: string)
holdEscrow(orderItemId: string)
releaseEscrowToSeller(orderItemId: string, reason: string)
refundEscrowToBuyer(orderItemId: string, reason: string)
lockEscrowForDispute(orderItemId: string, disputeId: string)
```

Rules:

* Only funded escrow can be held.
* Only held escrow can be released or disputed.
* Disputed escrow can only be released or refunded through admin resolution.
* Every escrow release or refund must create wallet ledger entries.
* Every escrow release or refund must be idempotent.

---

## 9.3 Order Item Methods

```ts
markOrderItemFunded(orderItemId: string)
markOrderItemAwaitingDispatch(orderItemId: string)
markOrderItemReadyForPickup(orderItemId: string, sellerId: string)
bookDeliveryForReadyOrderItem(orderItemId: string)
markOrderItemDispatched(orderItemId: string, sellerId: string, evidence: DispatchEvidence)
confirmOrderItemDelivery(orderItemId: string, buyerId: string)
rejectOrderItemDelivery(orderItemId: string, buyerId: string, reason: string, evidence?: Evidence)
confirmOrderItemWithOtp(orderItemId: string, otp: string, sellerId: string)
markOrderItemReleased(orderItemId: string)
markOrderItemRefunded(orderItemId: string)
```

Rules:

* Seller must own the store attached to the order item.
* Seller readiness can only be recorded after payment confirmation and escrow hold.
* Provider delivery booking can only happen after seller readiness.
* Seller cannot dispatch before payment confirmation.
* Dispatch or provider pickup must include valid evidence.
* Buyer confirmation must verify buyer ownership.
* Buyer rejection must verify buyer ownership and should create a controlled return/dispute path.
* OTP confirmation must validate code, expiry, and ownership.
* Released and refunded order items are final.

---

## 9.4 Dispute Methods

```ts
openDispute(orderItemId: string, buyerId: string, reason: string, evidence?: Evidence)
markDisputeUnderReview(disputeId: string, adminId: string)
requestBuyerReturn(disputeId: string, adminId: string)
uploadReturnEvidence(disputeId: string, buyerId: string, evidence: Evidence)
resolveDisputeForBuyer(disputeId: string, adminId: string, reason: string)
resolveDisputeForSeller(disputeId: string, adminId: string, reason: string)
cancelDispute(disputeId: string, actorId: string, reason: string)
```

Rules:

* Only the buyer who owns the order item can open a dispute.
* A dispute can only be opened before funds are released.
* Opening a dispute must lock the affected escrow.
* Admin resolution must create audit logs.
* Buyer-winning resolution triggers refund.
* Seller-winning resolution triggers release.
* A dispute cannot be resolved twice.

---

## 9.5 Wallet Methods

```ts
creditWallet(walletId: string, amountKobo: number, type: LedgerEntryType, reference: string)
debitWallet(walletId: string, amountKobo: number, type: LedgerEntryType, reference: string)
moveEscrowToSellerAvailable(orderItemId: string)
moveEscrowToBuyerRefund(orderItemId: string)
recordPlatformCommission(orderItemId: string)
```

Rules:

* Never mutate wallet balances without ledger entries.
* Use database transactions for balance and ledger updates.
* Prevent negative balances unless explicitly allowed for a controlled reason.
* All money values must be stored in kobo.
* Do not use floating point numbers for money.

---

## 9.6 Payout Methods

```ts
generateEodPayoutBatch()
createPayoutRecord(sellerWalletId: string, amountKobo: number)
markPayoutProcessing(payoutRecordId: string)
markPayoutSuccessful(payoutRecordId: string)
markPayoutFailed(payoutRecordId: string, reason: string)
```

Rules:

* Only available seller balances should be eligible for payout.
* Escrow balances must not be paid out.
* Disputed funds must not be paid out.
* Payout records must use bank account snapshots.
* Payout status changes must be auditable.
* Failed payouts should not lose the seller’s available balance.

---

## 10. Wallet and Ledger Effects

## 10.1 Buyer Payment Success

When payment is verified:

1. Create or update payment as `SUCCESS`.
2. Mark parent order as `PAID`.
3. Mark order items as `FUNDED` or `AWAITING_DISPATCH`.
4. Create escrow record per order item.
5. Move allocated funds into escrow hold.
6. Create ledger records.

Possible ledger entries:

| Wallet                        | Direction | Type            | Amount             |
| ----------------------------- | --------- | --------------- | ------------------ |
| Buyer/Payment Source Tracking | Debit     | `BUYER_PAYMENT` | Total order amount |
| Escrow/System Wallet          | Credit    | `ESCROW_HOLD`   | Item escrow amount |

If the payment provider holds real money externally, the ledger should still record the internal accounting event.

---

## 10.2 Seller Release

When escrow is released to seller:

1. Validate order item is eligible for release.
2. Validate escrow is `HELD` or `DISPUTED` resolved for seller.
3. Calculate seller net amount.
4. Calculate platform commission.
5. Credit seller wallet available balance.
6. Credit platform wallet with commission.
7. Mark escrow as `RELEASED`.
8. Mark order item as `RELEASED`.
9. Create ledger records.
10. Update parent order derived status.

Possible ledger entries:

| Wallet               | Direction | Type                  | Amount            |
| -------------------- | --------- | --------------------- | ----------------- |
| Escrow/System Wallet | Debit     | `ESCROW_RELEASE`      | Gross held amount |
| Seller Wallet        | Credit    | `ESCROW_RELEASE`      | Seller net amount |
| Platform Wallet      | Credit    | `PLATFORM_COMMISSION` | Platform fee      |

---

## 10.3 Buyer Refund

When escrow is refunded to buyer:

1. Validate order item is eligible for refund.
2. Validate escrow is not already released.
3. Credit buyer wallet or approved refund destination.
4. Mark escrow as `REFUNDED`.
5. Mark order item as `REFUNDED`.
6. Create ledger records.
7. Update parent order derived status.

Possible ledger entries:

| Wallet               | Direction | Type     | Amount        |
| -------------------- | --------- | -------- | ------------- |
| Escrow/System Wallet | Debit     | `REFUND` | Refund amount |
| Buyer Wallet         | Credit    | `REFUND` | Refund amount |

---

## 10.4 Payout

When seller payout is generated:

1. Identify seller wallets with eligible available balances.
2. Create payout batch.
3. Create payout records per seller/store wallet.
4. Move payout status to `PENDING` or `PROCESSING`.
5. Export or send payout records for bank processing.
6. On confirmation, mark records as `SUCCESS`.
7. Create ledger entries for payout debit.

Possible ledger entries:

| Wallet        | Direction | Type     | Amount        |
| ------------- | --------- | -------- | ------------- |
| Seller Wallet | Debit     | `PAYOUT` | Payout amount |

Payout batch generation must not include escrow, disputed, or unavailable funds.

---

## 11. Safety Timer and Auto-Release

The safety timer controls automatic release when the buyer is silent after verified dispatch or pickup.

Default assumption:

```txt
Safety timer duration: 5 days after seller-managed dispatch or provider pickup
```

This should be configurable through platform settings.

The timer should start only when:

1. Order item is paid.
2. Escrow is held.
3. Seller-managed dispatch evidence exists, or provider pickup evidence exists.
4. Order item becomes `DISPATCHED`.

Auto-release may happen when:

1. Current time is greater than or equal to `safetyTimerExpiresAt`.
2. Order item is still `DISPATCHED` or `DELIVERED`.
3. Escrow is still `HELD`.
4. No active dispute exists.
5. Funds have not already been released or refunded.

Auto-release must not happen when:

* Order item is disputed.
* Escrow is disputed.
* Buyer has already opened a dispute.
* Order item is already released.
* Order item is already refunded.
* Payment was not verified.
* Dispatch or pickup evidence is missing.

Auto-release processing must be idempotent.

---

## 12. Delivery and Dispatch Evidence Rules

Dispatch and provider pickup require evidence.

Evidence may include:

* Waybill image.
* Courier receipt.
* Tracking reference.
* Delivery photo, where applicable.
* Provider shipment reference.
* Provider pickup event.
* Provider delivery event.
* Rider or courier note where available.

Before moving an order item to `DISPATCHED`, validate:

1. Seller owns the store for the order item.
2. Order item is `AWAITING_DISPATCH`.
3. Payment has been verified.
4. Escrow is `HELD`.
5. Seller has marked the item ready for pickup, unless this is a seller-managed dispatch fallback.
6. Evidence file, provider pickup event, or tracking reference exists.
7. Evidence file type is allowed when a file is uploaded.
8. Evidence file size is within allowed limits when a file is uploaded.

When dispatch is successful:

1. Save evidence URL, storage key, provider event, or tracking reference.
2. Save dispatch timestamp.
3. Set `safetyTimerExpiresAt`.
4. Move order item to `DISPATCHED`.
5. Notify buyer.

Provider webhooks may create delivery events and update delivery shipment status. They must not by themselves confirm delivery, release escrow, refund escrow, or resolve disputes.

---

## 13. Buyer Confirmation Rules

Buyer confirmation releases funds.

Before confirmation:

1. Buyer must own the parent order.
2. Order item must be `DISPATCHED` or `DELIVERED`.
3. Escrow must be `HELD`.
4. No active dispute must exist.
5. Escrow must not already be released or refunded.

After confirmation:

1. Mark order item as `CONFIRMED`.
2. Mark delivery shipment as `DELIVERED_ACCEPTED`, where a shipment record exists.
3. Release escrow to seller.
4. Record platform commission.
5. Mark order item as `RELEASED`.
6. Update parent order status.
7. Notify seller.

Provider delivery completion, rider notes, or webhook events are not buyer confirmation. They are evidence for the confirmation, auto-release, or dispute flow.

## 13.1 Buyer Rejection Rules

Buyer rejection records that the buyer did not accept the delivered item at handoff or inspection.

Before rejection:

1. Buyer must own the parent order.
2. Order item must be `DISPATCHED` or `DELIVERED`.
3. Escrow must be `HELD`.
4. Escrow must not already be released or refunded.
5. Rejection reason should be captured.
6. Evidence should be captured where practical.

After rejection:

1. Mark delivery shipment as `DELIVERED_REJECTED`, where a shipment record exists.
2. Open a controlled return or dispute path.
3. Stop auto-release eligibility unless an admin later resolves for seller.
4. Preserve provider delivery events and rejection evidence for review.
5. Notify seller and admin where required.

`DELIVERED_REJECTED` does not automatically mean the buyer wins a refund. It means the buyer has rejected delivery and the system must decide the return/dispute outcome.

If return is required, move the shipment or dispute to `RETURN_PENDING`.

Return fees may be temporarily reserved from held funds so the platform does not carry open-ended logistics cost. Final return-fee responsibility should be assigned by policy or dispute outcome:

* Buyer pays when rejection is invalid or buyer-caused.
* Seller pays when seller shipped the wrong, damaged, fake, or materially different item.
* Provider/platform responsibility may apply if logistics failure caused the issue and the provider contract supports it.

---

## 14. OTP Confirmation Rules

OTP confirmation is an optional Digital Handshake mode.

OTP rules:

1. OTP belongs to the specific order item.
2. OTP must not be expired.
3. OTP must not have been used before.
4. OTP must be verified before release.
5. Seller must own the order item’s store.
6. Order item must be eligible for confirmation.
7. Escrow must be `HELD`.
8. No active dispute must exist.

After valid OTP confirmation:

1. Mark OTP as used.
2. Mark order item as `CONFIRMED`.
3. Mark delivery shipment as `DELIVERED_ACCEPTED`, where a shipment record exists.
4. Release escrow to seller.
5. Create ledger entries.
6. Notify buyer and seller.

Never store OTPs in plain text if persistence is required.

---

## 15. Dispute Rules

A buyer may dispute an order item if there is a delivery or product problem.

Common reasons:

* Item not delivered.
* Wrong item delivered.
* Damaged item delivered.
* Fake or misleading product listing.
* Seller cannot provide dispatch evidence.
* Return issue.

A dispute can be opened only when:

1. Buyer owns the parent order.
2. Order item is `DISPATCHED` or `DELIVERED`.
3. Escrow is `HELD`.
4. Order item is not already released.
5. Order item is not already refunded.
6. No active dispute already exists for the order item.

When a dispute is opened:

1. Create dispute record.
2. Mark dispute as `OPEN`.
3. Mark order item as `DISPUTED`.
4. Mark escrow as `DISPUTED`.
5. Stop auto-release eligibility.
6. Notify seller and admin.
7. Save buyer evidence where provided.

Admin resolution:

* If buyer wins, refund buyer.
* If seller wins, release funds to seller.
* If return is required, move dispute to return-related statuses before final resolution.

All admin dispute decisions must include:

* Admin ID.
* Decision.
* Reason.
* Timestamp.
* Audit log.
* Optional evidence notes.

---

## 16. Parent Order Completion Rules

The parent order should become `COMPLETED` when all order items are in a closed state.

Closed order item states:

```txt
RELEASED
REFUNDED
CANCELLED
```

If at least one item is still active, the order remains active.

Active item states include:

```txt
PENDING_PAYMENT
FUNDED
AWAITING_DISPATCH
DISPATCHED
DELIVERED
CONFIRMED
DISPUTED
```

Parent order status should generally be derived from child order items instead of manually set by arbitrary endpoints.

---

## 17. Idempotency Rules

The following operations must be idempotent:

* Payment webhook processing.
* Payment verification.
* Escrow funding.
* Escrow release.
* Escrow refund.
* Auto-release processing.
* Payout batch generation.
* Payout success/failure marking where provider callbacks are involved.

Use unique references to prevent duplicate processing.

Recommended unique references:

* Payment provider reference.
* Internal payment reference.
* Order reference.
* Order item escrow reference.
* Ledger entry reference.
* Payout batch reference.
* Payout provider reference.

If the same webhook or job runs twice, it must not duplicate:

* Wallet credits.
* Wallet debits.
* Ledger entries.
* Escrow releases.
* Refunds.
* Platform commissions.
* Payout records.

---

## 18. Database Transaction Rules

The following operations must run inside database transactions:

* Payment success processing.
* Creating escrow records for order items.
* Releasing escrow to seller.
* Refunding buyer.
* Opening a dispute and locking escrow.
* Resolving a dispute.
* Generating payout batches.
* Marking payout success or failure.
* Any operation that updates both balances and ledger records.

A transaction should include all related changes needed to keep the system consistent.

Example release transaction:

1. Validate escrow state.
2. Debit escrow/system balance.
3. Credit seller wallet.
4. Credit platform wallet.
5. Create ledger entries.
6. Update escrow status.
7. Update order item status.
8. Create audit log if actor is admin/system-sensitive.

---

## 19. Audit Requirements

Audit logs are required for:

* Admin dispute review.
* Admin dispute resolution.
* Manual refund.
* Manual release.
* KYC approval or rejection.
* Payout batch generation.
* Payout status changes.
* Platform fee changes.
* Auto-release execution.
* Manual wallet adjustments.

Audit log fields should include:

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

System actions should use a system actor or actor type.

---

## 20. Notifications

Notifications should be sent for important state changes.

Recommended notification events:

| Event                         | Recipient     |
| ----------------------------- | ------------- |
| Payment confirmed             | Buyer, seller |
| Seller readiness required     | Seller        |
| Delivery booked               | Buyer, seller |
| Item dispatched or picked up  | Buyer         |
| Safety timer started          | Buyer, seller |
| Buyer accepted delivery       | Seller        |
| Buyer rejected delivery       | Seller, admin |
| Escrow released               | Seller        |
| Dispute opened                | Seller, admin |
| Dispute resolved              | Buyer, seller |
| Refund issued                 | Buyer         |
| Payout batch generated        | Admin         |
| Payout successful             | Seller        |
| KYC approved/rejected         | Seller        |

Notification failure should not corrupt the financial transaction.

If notification sending fails, log the error and retry where appropriate.

---

## 21. Suggested Service Boundaries

Recommended service responsibilities:

## 21.1 OrdersService

Responsible for:

* Creating orders.
* Reading buyer/seller/admin order views.
* Updating derived parent order status.
* Validating order ownership.
* Coordinating order item flow.

Should not directly mutate wallet balances.

---

## 21.2 EscrowService

Responsible for:

* Creating escrow records.
* Funding escrow.
* Holding escrow.
* Locking escrow.
* Releasing escrow.
* Refunding escrow.
* Validating escrow transitions.

Should coordinate with WalletsService for ledger-backed balance changes.

---

## 21.3 WalletsService

Responsible for:

* Wallet creation.
* Ledger entries.
* Balance updates.
* Wallet balance views.
* Payout eligibility calculations.

Should never expose unsafe balance mutation endpoints.

---

## 21.4 PaymentsService

Responsible for:

* Payment initiation.
* Payment verification.
* Webhook handling.
* Provider abstraction.
* Idempotency checks.

Should not trust frontend payment success claims.

---

## 21.5 DisputesService

Responsible for:

* Opening disputes.
* Managing dispute status.
* Admin review.
* Admin resolution.
* Return evidence.
* Triggering refund or release after resolution.

---

## 21.6 SettlementsService

Responsible for:

* EOD payout batch generation.
* Payout record creation.
* Payout status tracking.
* Export preparation.
* Payout audit.

---

## 22. Minimum Test Cases

Codex must add or update tests when implementing these flows.

## 22.1 Payment Tests

* Payment webhook with valid signature marks payment successful.
* Duplicate webhook does not duplicate escrow or ledger records.
* Invalid webhook signature is rejected.
* Frontend-only payment confirmation does not mark order as paid.

## 22.2 Escrow Tests

* Payment success creates escrow records per order item.
* Escrow cannot be released before payment.
* Escrow cannot be released twice.
* Escrow cannot be refunded after release.
* Disputed escrow cannot auto-release.
* Admin can resolve disputed escrow for buyer.
* Admin can resolve disputed escrow for seller.

## 22.3 Order Item Tests

* Seller cannot dispatch unpaid item.
* Seller cannot dispatch another seller’s item.
* Seller readiness is required before provider booking.
* Dispatch or provider pickup requires evidence.
* Dispatch or provider pickup starts safety timer.
* Buyer can confirm own delivered/dispatched item.
* Buyer can reject own delivered/dispatched item.
* Buyer cannot confirm another buyer’s item.
* Released item cannot be disputed.
* Refunded item cannot be released.

## 22.4 Dispute Tests

* Buyer can open dispute on own eligible order item.
* Buyer cannot open dispute after release.
* Opening dispute locks escrow.
* Duplicate active disputes are rejected.
* Admin resolution for buyer triggers refund.
* Admin resolution for seller triggers release.
* Dispute cannot be resolved twice.

## 22.5 Wallet Tests

* Wallet credits create ledger entries.
* Wallet debits create ledger entries.
* Balance cannot go negative unless explicitly allowed.
* Platform commission is recorded on release.
* Refund credits buyer wallet.
* Seller release credits seller wallet.

## 22.6 Payout Tests

* Payout batch includes only available seller balances.
* Payout batch excludes escrow balances.
* Payout batch excludes disputed funds.
* Failed payout does not lose seller funds.
* Successful payout debits seller available balance.
* Duplicate payout processing does not duplicate debits.

---

## 23. Implementation Notes for Codex

When implementing any part of this state machine:

1. Read `AGENTS.md`.
2. Read this document.
3. Inspect existing schema and modules.
4. Propose a short implementation plan.
5. Implement one vertical slice at a time.
6. Use Zod validation for request payloads.
7. Keep controllers thin.
8. Put business rules in services.
9. Use database transactions for financial changes.
10. Add tests for valid and invalid transitions.
11. Ensure API responses follow the project response standard.
12. Ensure Swagger documentation exists.
13. Do not introduce unsafe generic update endpoints.

---

## 24. MVP Simplifications Allowed

For MVP, the following simplifications are allowed if explicitly chosen:

1. Use admin-reviewed EOD payout export instead of automatic bank payout.
2. Use buyer “Confirm Delivery” button before adding OTP flow.
3. Use simple file URL storage before integrating object storage.
4. Use scheduled job polling for auto-release before adding a full queue system.
5. Use a single platform commission setting before category-specific commissions.
6. Use manual KYC review before automated identity verification.
7. Skip independent `DELIVERED` status if there is no logistics integration.

Even with MVP simplifications, the following must not be skipped:

* Payment verification must be server-side.
* Escrow release must be state-controlled.
* Wallet movement must have ledger records.
* Disputes must lock affected escrow.
* Admin financial decisions must be audited.
* Money must not be stored as floating point values.

---

## 25. Final Rule

If a requested implementation conflicts with this state machine, stop and explain the conflict before coding.

Do not silently implement unsafe escrow, wallet, payment, dispute, or payout logic.
