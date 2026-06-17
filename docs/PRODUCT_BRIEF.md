# Escrova Product Brief

## 1. Product Name

**Escrova**

## 2. Product Summary

Escrova is a Nigerian peer-to-peer commerce and escrow platform that helps buyers and sellers transact safely online.

The platform acts as a trusted digital middleman between buyers and sellers. Instead of buyers sending money directly to sellers before delivery, Escrova holds the buyer’s payment in escrow. The seller is only paid after the buyer confirms that the item has been delivered and accepted, or after a defined auto-release period passes without a dispute.

Escrova is designed for Nigeria’s growing social commerce and informal online marketplace ecosystem, where many transactions happen through Instagram, WhatsApp, X, Facebook Marketplace, vendor pages, and direct messaging. The platform reduces the common risks of “pay first and hope” for buyers and “deliver first and hope” for sellers.

## 3. Problem Statement

Online commerce in Nigeria has a major trust problem.

Buyers often fear that sellers may disappear after receiving payment, deliver the wrong item, deliver a damaged product, or fail to deliver at all. Sellers also face risk when buyers request delivery before payment or make false claims after receiving products.

Many small sellers operate through social media and informal storefronts without the protection offered by large marketplaces. This creates friction, slows down transactions, and limits buyer confidence.

Escrova solves this by introducing a secure escrow layer that protects both sides of a transaction.

## 4. Target Market

Escrova is primarily built for the Nigerian market, especially users involved in peer-to-peer and small business commerce.

### Primary users

1. **Buyers**

   * Individuals purchasing products from online vendors.
   * Social media shoppers.
   * Users who want confidence before paying unknown sellers.

2. **Sellers**

   * Instagram vendors.
   * WhatsApp sellers.
   * Small online stores.
   * Independent merchants.
   * Multi-store business owners.

3. **Admins**

   * Platform operators responsible for KYC verification, dispute resolution, payout generation, category management, and platform monitoring.

## 5. Core Value Proposition

Escrova makes online buying and selling safer by holding payment until the transaction is verified.

### For buyers

Escrova gives buyers confidence that their money will not be released to the seller until the item is delivered and accepted.

### For sellers

Escrova gives sellers confidence that the buyer has already paid before they dispatch the product.

### For the platform

Escrova creates a trusted marketplace infrastructure that can scale without relying on physical inspection hubs or expensive logistics integrations.

## 6. Product Vision

To become the trusted checkout and escrow infrastructure for Nigerian online commerce, enabling safe transactions between strangers, social media vendors, independent sellers, and everyday buyers.

## 7. Product Mission

Escrova’s mission is to reduce online transaction fraud by giving buyers and sellers a secure, transparent, and automated way to complete transactions.

## 8. Key Product Concept

Escrova is built around three core ideas:

### 8.1 Secure Payment Hold

The buyer pays into Escrova, not directly to the seller. The payment is held securely in escrow until the transaction is completed.

### 8.2 Digital Handshake

The buyer confirms delivery and satisfaction through a verification action. This may be done by clicking a confirmation button or providing a delivery OTP.

### 8.3 Evidence-Based Resolution

If a dispute occurs, Escrova uses submitted evidence such as waybill images, product photos, return proof, seller KYC data, and transaction history to help admins resolve the issue fairly.

## 9. Core Transaction Flow

### 9.1 Seller flow

1. Seller registers or logs into Escrova.
2. Seller creates one or more store profiles.
3. Seller completes KYC for each store profile.
4. Seller lists products and sets shipping prices.
5. Buyer places an order and pays into escrow.
6. Seller receives confirmation that funds are secured.
7. Seller ships the item.
8. Seller uploads proof of dispatch, such as a waybill image.
9. Buyer confirms delivery or raises a dispute.
10. Seller receives funds after buyer confirmation, auto-release, or admin dispute resolution.

### 9.2 Buyer flow

1. Buyer browses marketplace products or visits a seller storefront.
2. Buyer adds products to cart.
3. Buyer pays a consolidated order amount.
4. Escrova splits the order into individual order items where necessary.
5. Buyer tracks each item separately.
6. Buyer confirms delivery using the Digital Handshake.
7. Buyer may raise a dispute if the product is not delivered, incorrect, damaged, or unacceptable.
8. Buyer receives a refund to wallet if the dispute is resolved in their favour.

### 9.3 Admin flow

1. Admin reviews seller KYC submissions.
2. Admin monitors transactions and escrow activity.
3. Admin reviews disputes and supporting evidence.
4. Admin decides whether to release funds to seller or refund buyer.
5. Admin generates end-of-day payout batches.
6. Admin manages categories, platform settings, and activity logs.

## 10. Main Product Features

### 10.1 Automated Escrow Engine

Escrova holds buyer payments in escrow until the transaction reaches a valid release condition.

Release conditions may include:

* Buyer confirms successful delivery.
* Buyer provides delivery OTP.
* Auto-release timer expires without buyer dispute.
* Admin resolves a dispute in favour of the seller.

Refund conditions may include:

* Admin resolves a dispute in favour of the buyer.
* Seller fails to dispatch within an allowed timeframe.
* Transaction is cancelled before fulfilment.

### 10.2 Digital Handshake and Verification

The Digital Handshake is the buyer’s confirmation that the item has been received and accepted.

Supported confirmation methods may include:

* Buyer clicks “Confirm Delivery”.
* Buyer gives a delivery OTP to the seller.
* System auto-confirms after a defined safety period if no dispute is raised.

### 10.3 Evidence-Based Dispatch

Sellers must upload evidence after dispatching an order item.

Evidence may include:

* Courier waybill image.
* Dispatch receipt.
* Delivery photo.
* Tracking reference, where available.

This evidence helps buyers track fulfilment and helps admins resolve disputes.

### 10.4 Order Item-Level Escrow

Escrova supports multi-seller and multi-item orders.

A buyer may pay once for several products, but the system should track each order item independently. Each order item can have its own seller, delivery status, escrow amount, proof of dispatch, dispute status, and release state.

This allows one item in an order to be disputed while other completed items are released normally.

### 10.5 Wallet and Ledger System

Escrova uses internal wallets to track user balances.

Wallets may belong to:

* Buyers
* Seller store profiles
* Platform entity

Wallet balances should support:

* Available balance
* Escrow balance
* Pending payout balance
* Refund balance

All financial movement must be recorded through a ledger or transaction record for auditability.

### 10.6 Conflict and Dispute Management

Buyers can open disputes when there is a problem with an order item.

Common dispute reasons include:

* Item not delivered.
* Wrong item delivered.
* Damaged item delivered.
* Fake or misleading product listing.
* Seller unable to provide dispatch proof.

When a dispute is opened, funds for that specific order item are locked. Admins review the evidence and decide whether to release the funds to the seller or refund the buyer.

### 10.7 Multi-Storefront Profile Management

A user may create and manage multiple seller store profiles.

Each store profile should have:

* Business name
* Unique store URL handle
* Business category
* Bank account details
* KYC status
* Dedicated seller wallet
* Product listings
* Store activity and fulfilment records

This allows one person to operate multiple businesses under a single master account.

### 10.8 KYC and Seller Verification

Sellers must complete KYC before their stores and products can become publicly visible.

KYC documents may include:

* NIN
* BVN
* Driver’s License
* Voter’s Card
* CAC document

Admins review submitted documents and approve or reject seller verification.

### 10.9 EOD Bulk Settlement

Escrova supports end-of-day seller payout processing.

At a defined time, the platform groups cleared seller balances into payout batches. These batches can be reviewed by admins and exported for external bank transfer processing.

Each payout record should include:

* Seller
* Amount
* Bank account snapshot
* Payout status
* Batch reference

### 10.10 Hierarchical Category Discovery

Escrova supports product discovery through categories and subcategories.

The category system should allow:

* Root categories
* Subcategories
* Leaf categories
* Public browsing
* Product category linking
* Admin category management

## 11. User Roles

### 11.1 Guest

Guests can:

* View the landing page.
* Browse the public marketplace.
* Search products.
* View seller storefronts.
* View product details.

Guests cannot:

* Add to cart.
* Buy products.
* Open a store.
* Raise disputes.
* Access dashboards.

When a guest attempts a restricted action, the platform should redirect them to login or registration.

### 11.2 Buyer

Buyers can:

* Register and log in.
* Browse products.
* Add items to cart.
* Place orders.
* Pay into escrow.
* Track purchases.
* Confirm delivery.
* Raise disputes.
* Manage delivery addresses.
* Receive refunds into wallet.

### 11.3 Seller

Sellers can:

* Register or upgrade from buyer to seller.
* Create one or more store profiles.
* Complete KYC.
* Add products.
* Upload product images.
* Manage inventory.
* Set shipping prices.
* View paid orders.
* Upload dispatch evidence.
* Verify buyer OTP where applicable.
* Track escrow and available balances.
* Receive payouts.

### 11.4 Admin

Admins can:

* Manage users.
* Review seller KYC documents.
* Moderate products and stores.
* Resolve disputes.
* Generate payout batches.
* Export payout records.
* Manage categories.
* Manage platform settings.
* View activity logs.

## 12. Core Business Rules

1. Buyers do not pay sellers directly.
2. Buyer payment must be confirmed before seller dispatch.
3. Seller funds remain locked until a valid release event occurs.
4. Sellers cannot receive payout for disputed order items until the dispute is resolved.
5. Disputes should lock only the affected order item, not the entire parent order.
6. Each seller store profile must have its own wallet.
7. A seller must complete KYC before products become visible to the public marketplace.
8. A buyer refund should be credited to the buyer wallet.
9. Platform commission should be deducted only when a transaction is successfully completed.
10. Every financial movement must create an auditable transaction or ledger record.
11. Money should be stored in the smallest currency unit, such as kobo.
12. Generic status updates should not be allowed for escrow and wallet workflows. All status changes must pass through explicit business methods.
13. The auto-release timer should only begin after the seller marks an item as shipped and uploads dispatch evidence.
14. Admin actions must be logged with the admin ID, target record, action type, reason, and timestamp.

## 13. Key Data Objects

The product requires the following major data objects:

* User
* Buyer Profile
* Seller Profile
* Wallet
* Wallet Transaction / Ledger Entry
* Product
* Product Image
* Product Attribute
* Business Category
* Product Category
* Cart Item
* Order
* Order Item
* Dispatch Evidence
* Dispute
* KYC Document
* Buyer Address
* Platform Setting
* Payout Batch
* Payout Record
* Admin Activity Log
* Platform Entity

## 14. Suggested MVP Scope

The first version of Escrova should focus on proving the escrow transaction flow.

### MVP features

1. User registration and login.
2. Buyer and seller roles.
3. Seller store creation.
4. Basic KYC submission.
5. Product listing.
6. Product discovery.
7. Cart and checkout.
8. Escrow payment record creation.
9. Order and order item tracking.
10. Seller dispatch evidence upload.
11. Buyer delivery confirmation.
12. Fund release to seller wallet.
13. Basic dispute creation.
14. Admin dispute resolution.
15. Seller wallet balance.
16. Basic payout batch generation.

### Non-MVP features

The following can come after the first stable release:

* Social login.
* Apple and Facebook authentication.
* Advanced analytics.
* Automated bank payout integration.
* Logistics API integration.
* Wishlist.
* Product recommendation engine.
* Seller ads or promoted listings.
* Mobile apps.
* Advanced fraud scoring.
* Chat between buyer and seller.

## 15. Success Metrics

Escrova’s success can be measured by:

* Number of completed escrow transactions.
* Percentage of transactions completed without dispute.
* Number of active sellers.
* Number of verified seller stores.
* Number of repeat buyers.
* Total transaction value processed.
* Average dispute resolution time.
* Seller payout success rate.
* Buyer refund success rate.
* Reduction in failed or abandoned transactions.

## 16. High-Level Technical Direction

Escrova should start as a modular monolith API using NestJS.

Recommended backend approach:

* NestJS for API development.
* PostgreSQL for relational data storage.
* Prisma as ORM.
* JWT for authentication.
* Role-based access control.
* DTO-based validation.
* Swagger/OpenAPI documentation.
* Jest for unit and integration testing.
* Background jobs for auto-release timers and payout batch generation.
* Object storage for uploaded images and documents.
* Ledger-based wallet accounting.

The initial system should prioritize correctness, auditability, and security over premature microservice complexity.

## 17. Product Positioning

Escrova should be positioned as:

**The safe way to buy and sell online in Nigeria.**

Alternative positioning statements:

* Buy online without fear.
* Sell online without stories.
* The trusted middleman for online deals.
* Secure payment for social commerce.
* Pay, verify, release.

## 18. Open Product Decisions

The following decisions should be clarified before or during implementation:

1. Which payment provider will be used first?
2. Will Escrova support Paystack, Flutterwave, Monnify, bank transfer, or multiple providers?
3. How long should the auto-release timer be?
4. Should the default auto-release timer be 5 days for all categories or configurable per category?
5. Should buyers be able to withdraw refunds to bank accounts or only reuse wallet balance?
6. Should sellers receive automatic bank payouts or admin-reviewed payouts first?
7. Should delivery OTP be mandatory or optional?
8. Should sellers be able to deliver personally or only through logistics partners?
9. What exact platform commission percentage should apply?
10. Should shipping fee be held in escrow, released to seller, or treated separately?
11. What documents are mandatory for seller KYC?
12. Should each seller store require separate KYC approval?
13. Should a seller be allowed to list products before KYC approval if products remain hidden?
14. What is the first supported country and currency?
15. What admin permissions should exist beyond a single Admin role?
