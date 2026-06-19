-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUYER', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('PENDING_KYC', 'ACTIVE', 'SUSPENDED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'LIVE', 'HIDDEN', 'OUT_OF_STOCK', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VisibilityStatus" AS ENUM ('ACTIVE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PARTIALLY_FULFILLED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING_PAYMENT', 'FUNDED', 'AWAITING_DISPATCH', 'DISPATCHED', 'DELIVERED', 'CONFIRMED', 'DISPUTED', 'RELEASED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('PENDING', 'FUNDED', 'HELD', 'DISPUTED', 'RELEASED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK', 'FLUTTERWAVE', 'MONNIFY', 'BANK_TRANSFER', 'MANUAL');

-- CreateEnum
CREATE TYPE "WalletOwnerType" AS ENUM ('BUYER', 'SELLER', 'PLATFORM');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('BUYER_PAYMENT', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'REFUND', 'PLATFORM_COMMISSION', 'PAYOUT', 'PAYOUT_REVERSAL', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'AWAITING_BUYER_RETURN', 'RETURN_IN_TRANSIT', 'RESOLVED_BUYER_WON', 'RESOLVED_SELLER_WON', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('NIN', 'BVN', 'DRIVERS_LICENSE', 'VOTERS_CARD', 'CAC');

-- CreateEnum
CREATE TYPE "PayoutBatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutRecordStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'BUYER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "phoneNumber" TEXT,
    "refreshTokenHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerAddress" (
    "id" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "state" TEXT NOT NULL,
    "city" TEXT,
    "streetAddress" TEXT NOT NULL,
    "deliveryNotes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "VisibilityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessCategoryId" TEXT,
    "username" TEXT,
    "businessName" TEXT NOT NULL,
    "storeHandle" TEXT NOT NULL,
    "storeUrl" TEXT,
    "baseLocation" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "status" "StoreStatus" NOT NULL DEFAULT 'PENDING_KYC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "documentImageUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedByAdminId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformEntity" (
    "id" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "corporateBankName" TEXT,
    "corporateAccountNumber" TEXT,
    "corporateAccountName" TEXT,
    "lastAuditAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "ownerType" "WalletOwnerType" NOT NULL,
    "buyerProfileId" TEXT,
    "sellerProfileId" TEXT,
    "platformEntityId" TEXT,
    "availableBalanceKobo" BIGINT NOT NULL DEFAULT 0,
    "escrowBalanceKobo" BIGINT NOT NULL DEFAULT 0,
    "pendingPayoutBalanceKobo" BIGINT NOT NULL DEFAULT 0,
    "payoutPinHash" TEXT,
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedgerEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "amountKobo" BIGINT NOT NULL,
    "balanceBeforeKobo" BIGINT NOT NULL,
    "balanceAfterKobo" BIGINT NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "relatedOrderId" TEXT,
    "relatedOrderItemId" TEXT,
    "relatedEscrowId" TEXT,
    "relatedPaymentId" TEXT,
    "relatedPayoutRecordId" TEXT,
    "narration" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentCategoryId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "status" "VisibilityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "priceKobo" BIGINT NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storageKey" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "selectedAttributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "orderReference" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "totalProductAmountKobo" BIGINT NOT NULL,
    "totalShippingFeeKobo" BIGINT NOT NULL,
    "totalServiceFeeKobo" BIGINT NOT NULL,
    "totalOrderAmountKobo" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceAtCheckoutKobo" BIGINT NOT NULL,
    "productAmountKobo" BIGINT NOT NULL,
    "shippingFeeKobo" BIGINT NOT NULL,
    "serviceFeeKobo" BIGINT NOT NULL,
    "netEscrowAmountKobo" BIGINT NOT NULL,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "deliveryHandledBy" TEXT,
    "safetyTimerExpiresAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerReference" TEXT,
    "internalReference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "amountKobo" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "providerPayload" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowTransaction" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "paymentId" TEXT,
    "escrowReference" TEXT NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'PENDING',
    "grossAmountKobo" BIGINT NOT NULL,
    "sellerNetAmountKobo" BIGINT NOT NULL,
    "platformFeeKobo" BIGINT NOT NULL,
    "shippingFeeKobo" BIGINT NOT NULL,
    "heldAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchEvidence" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "evidenceType" TEXT,
    "imageUrl" TEXT,
    "storageKey" TEXT,
    "trackingReference" TEXT,
    "courierName" TEXT,
    "notes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DispatchEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "raisedByUserId" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "evidenceImageUrl" TEXT,
    "evidenceStorageKey" TEXT,
    "returnWaybillImageUrl" TEXT,
    "returnStorageKey" TEXT,
    "returnStatus" TEXT,
    "adminResolutionReason" TEXT,
    "resolvedByAdminId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutBatch" (
    "id" TEXT NOT NULL,
    "batchReference" TEXT NOT NULL,
    "status" "PayoutBatchStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmountKobo" BIGINT NOT NULL,
    "sellerCount" INTEGER NOT NULL,
    "generatedByAdminId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "sellerWalletId" TEXT NOT NULL,
    "payoutReference" TEXT NOT NULL,
    "amountKobo" BIGINT NOT NULL,
    "bankNameSnapshot" TEXT NOT NULL,
    "accountNumberSnapshot" TEXT NOT NULL,
    "accountNameSnapshot" TEXT NOT NULL,
    "status" "PayoutRecordStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "settingValue" TEXT NOT NULL,
    "settingsGroup" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "description" TEXT,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActivityLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "actionType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerProfile_userId_key" ON "BuyerProfile"("userId");

-- CreateIndex
CREATE INDEX "BuyerProfile_userId_idx" ON "BuyerProfile"("userId");

-- CreateIndex
CREATE INDEX "BuyerProfile_phoneNumber_idx" ON "BuyerProfile"("phoneNumber");

-- CreateIndex
CREATE INDEX "BuyerProfile_status_idx" ON "BuyerProfile"("status");

-- CreateIndex
CREATE INDEX "BuyerAddress_buyerProfileId_idx" ON "BuyerAddress"("buyerProfileId");

-- CreateIndex
CREATE INDEX "BuyerAddress_state_idx" ON "BuyerAddress"("state");

-- CreateIndex
CREATE INDEX "BuyerAddress_isDefault_idx" ON "BuyerAddress"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCategory_name_key" ON "BusinessCategory"("name");

-- CreateIndex
CREATE INDEX "BusinessCategory_status_idx" ON "BusinessCategory"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_storeHandle_key" ON "SellerProfile"("storeHandle");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_storeUrl_key" ON "SellerProfile"("storeUrl");

-- CreateIndex
CREATE INDEX "SellerProfile_userId_idx" ON "SellerProfile"("userId");

-- CreateIndex
CREATE INDEX "SellerProfile_businessCategoryId_idx" ON "SellerProfile"("businessCategoryId");

-- CreateIndex
CREATE INDEX "SellerProfile_kycStatus_idx" ON "SellerProfile"("kycStatus");

-- CreateIndex
CREATE INDEX "SellerProfile_status_idx" ON "SellerProfile"("status");

-- CreateIndex
CREATE INDEX "KycDocument_sellerProfileId_idx" ON "KycDocument"("sellerProfileId");

-- CreateIndex
CREATE INDEX "KycDocument_documentType_idx" ON "KycDocument"("documentType");

-- CreateIndex
CREATE INDEX "KycDocument_status_idx" ON "KycDocument"("status");

-- CreateIndex
CREATE INDEX "KycDocument_reviewedByAdminId_idx" ON "KycDocument"("reviewedByAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_buyerProfileId_key" ON "Wallet"("buyerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_sellerProfileId_key" ON "Wallet"("sellerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_platformEntityId_key" ON "Wallet"("platformEntityId");

-- CreateIndex
CREATE INDEX "Wallet_ownerType_idx" ON "Wallet"("ownerType");

-- CreateIndex
CREATE INDEX "Wallet_status_idx" ON "Wallet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLedgerEntry_idempotencyKey_key" ON "WalletLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_walletId_idx" ON "WalletLedgerEntry"("walletId");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_direction_idx" ON "WalletLedgerEntry"("direction");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_entryType_idx" ON "WalletLedgerEntry"("entryType");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_reference_idx" ON "WalletLedgerEntry"("reference");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_relatedOrderId_idx" ON "WalletLedgerEntry"("relatedOrderId");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_relatedOrderItemId_idx" ON "WalletLedgerEntry"("relatedOrderItemId");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_relatedEscrowId_idx" ON "WalletLedgerEntry"("relatedEscrowId");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_relatedPaymentId_idx" ON "WalletLedgerEntry"("relatedPaymentId");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_relatedPayoutRecordId_idx" ON "WalletLedgerEntry"("relatedPayoutRecordId");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_createdAt_idx" ON "WalletLedgerEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentCategoryId_idx" ON "Category"("parentCategoryId");

-- CreateIndex
CREATE INDEX "Category_level_idx" ON "Category"("level");

-- CreateIndex
CREATE INDEX "Category_status_idx" ON "Category"("status");

-- CreateIndex
CREATE INDEX "Product_sellerProfileId_idx" ON "Product"("sellerProfileId");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sellerProfileId_slug_key" ON "Product"("sellerProfileId", "slug");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_isPrimary_idx" ON "ProductImage"("isPrimary");

-- CreateIndex
CREATE INDEX "ProductCategory_productId_idx" ON "ProductCategory"("productId");

-- CreateIndex
CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_productId_categoryId_key" ON "ProductCategory"("productId", "categoryId");

-- CreateIndex
CREATE INDEX "CartItem_buyerProfileId_idx" ON "CartItem"("buyerProfileId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_buyerProfileId_productId_key" ON "CartItem"("buyerProfileId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderReference_key" ON "Order"("orderReference");

-- CreateIndex
CREATE INDEX "Order_buyerProfileId_idx" ON "Order"("buyerProfileId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderItem_sellerProfileId_idx" ON "OrderItem"("sellerProfileId");

-- CreateIndex
CREATE INDEX "OrderItem_status_idx" ON "OrderItem"("status");

-- CreateIndex
CREATE INDEX "OrderItem_safetyTimerExpiresAt_idx" ON "OrderItem"("safetyTimerExpiresAt");

-- CreateIndex
CREATE INDEX "OrderItem_createdAt_idx" ON "OrderItem"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerReference_key" ON "Payment"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_internalReference_key" ON "Payment"("internalReference");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_buyerProfileId_idx" ON "Payment"("buyerProfileId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_provider_idx" ON "Payment"("provider");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowTransaction_orderItemId_key" ON "EscrowTransaction"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowTransaction_escrowReference_key" ON "EscrowTransaction"("escrowReference");

-- CreateIndex
CREATE INDEX "EscrowTransaction_sellerProfileId_idx" ON "EscrowTransaction"("sellerProfileId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_buyerProfileId_idx" ON "EscrowTransaction"("buyerProfileId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_paymentId_idx" ON "EscrowTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_status_idx" ON "EscrowTransaction"("status");

-- CreateIndex
CREATE INDEX "EscrowTransaction_createdAt_idx" ON "EscrowTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "DispatchEvidence_orderItemId_idx" ON "DispatchEvidence"("orderItemId");

-- CreateIndex
CREATE INDEX "DispatchEvidence_sellerProfileId_idx" ON "DispatchEvidence"("sellerProfileId");

-- CreateIndex
CREATE INDEX "DispatchEvidence_trackingReference_idx" ON "DispatchEvidence"("trackingReference");

-- CreateIndex
CREATE INDEX "DispatchEvidence_uploadedAt_idx" ON "DispatchEvidence"("uploadedAt");

-- CreateIndex
CREATE INDEX "Dispute_orderItemId_idx" ON "Dispute"("orderItemId");

-- CreateIndex
CREATE INDEX "Dispute_raisedByUserId_idx" ON "Dispute"("raisedByUserId");

-- CreateIndex
CREATE INDEX "Dispute_buyerProfileId_idx" ON "Dispute"("buyerProfileId");

-- CreateIndex
CREATE INDEX "Dispute_sellerProfileId_idx" ON "Dispute"("sellerProfileId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_resolvedByAdminId_idx" ON "Dispute"("resolvedByAdminId");

-- CreateIndex
CREATE INDEX "Dispute_createdAt_idx" ON "Dispute"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutBatch_batchReference_key" ON "PayoutBatch"("batchReference");

-- CreateIndex
CREATE INDEX "PayoutBatch_status_idx" ON "PayoutBatch"("status");

-- CreateIndex
CREATE INDEX "PayoutBatch_generatedAt_idx" ON "PayoutBatch"("generatedAt");

-- CreateIndex
CREATE INDEX "PayoutBatch_generatedByAdminId_idx" ON "PayoutBatch"("generatedByAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutRecord_payoutReference_key" ON "PayoutRecord"("payoutReference");

-- CreateIndex
CREATE INDEX "PayoutRecord_batchId_idx" ON "PayoutRecord"("batchId");

-- CreateIndex
CREATE INDEX "PayoutRecord_sellerProfileId_idx" ON "PayoutRecord"("sellerProfileId");

-- CreateIndex
CREATE INDEX "PayoutRecord_sellerWalletId_idx" ON "PayoutRecord"("sellerWalletId");

-- CreateIndex
CREATE INDEX "PayoutRecord_status_idx" ON "PayoutRecord"("status");

-- CreateIndex
CREATE INDEX "PayoutRecord_createdAt_idx" ON "PayoutRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_settingKey_key" ON "PlatformSetting"("settingKey");

-- CreateIndex
CREATE INDEX "PlatformSetting_settingsGroup_idx" ON "PlatformSetting"("settingsGroup");

-- CreateIndex
CREATE INDEX "PlatformSetting_updatedByAdminId_idx" ON "PlatformSetting"("updatedByAdminId");

-- CreateIndex
CREATE INDEX "AdminActivityLog_actorUserId_idx" ON "AdminActivityLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AdminActivityLog_actionType_idx" ON "AdminActivityLog"("actionType");

-- CreateIndex
CREATE INDEX "AdminActivityLog_targetType_idx" ON "AdminActivityLog"("targetType");

-- CreateIndex
CREATE INDEX "AdminActivityLog_targetId_idx" ON "AdminActivityLog"("targetId");

-- CreateIndex
CREATE INDEX "AdminActivityLog_createdAt_idx" ON "AdminActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerAddress" ADD CONSTRAINT "BuyerAddress_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_businessCategoryId_fkey" FOREIGN KEY ("businessCategoryId") REFERENCES "BusinessCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_platformEntityId_fkey" FOREIGN KEY ("platformEntityId") REFERENCES "PlatformEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_relatedOrderId_fkey" FOREIGN KEY ("relatedOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_relatedOrderItemId_fkey" FOREIGN KEY ("relatedOrderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_relatedEscrowId_fkey" FOREIGN KEY ("relatedEscrowId") REFERENCES "EscrowTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_relatedPaymentId_fkey" FOREIGN KEY ("relatedPaymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_relatedPayoutRecordId_fkey" FOREIGN KEY ("relatedPayoutRecordId") REFERENCES "PayoutRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchEvidence" ADD CONSTRAINT "DispatchEvidence_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchEvidence" ADD CONSTRAINT "DispatchEvidence_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedByUserId_fkey" FOREIGN KEY ("raisedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_resolvedByAdminId_fkey" FOREIGN KEY ("resolvedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRecord" ADD CONSTRAINT "PayoutRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayoutBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRecord" ADD CONSTRAINT "PayoutRecord_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRecord" ADD CONSTRAINT "PayoutRecord_sellerWalletId_fkey" FOREIGN KEY ("sellerWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutBatch" ADD CONSTRAINT "PayoutBatch_generatedByAdminId_fkey" FOREIGN KEY ("generatedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSetting" ADD CONSTRAINT "PlatformSetting_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActivityLog" ADD CONSTRAINT "AdminActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Financial and ownership integrity checks not expressible in Prisma schema.
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_owner_type_matches_check" CHECK (
    (
        "ownerType" = 'BUYER'::"WalletOwnerType"
        AND "buyerProfileId" IS NOT NULL
        AND "sellerProfileId" IS NULL
        AND "platformEntityId" IS NULL
    )
    OR (
        "ownerType" = 'SELLER'::"WalletOwnerType"
        AND "buyerProfileId" IS NULL
        AND "sellerProfileId" IS NOT NULL
        AND "platformEntityId" IS NULL
    )
    OR (
        "ownerType" = 'PLATFORM'::"WalletOwnerType"
        AND "buyerProfileId" IS NULL
        AND "sellerProfileId" IS NULL
        AND "platformEntityId" IS NOT NULL
    )
);

ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_non_negative_balances_check" CHECK (
    "availableBalanceKobo" >= 0
    AND "escrowBalanceKobo" >= 0
    AND "pendingPayoutBalanceKobo" >= 0
);

ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_positive_amount_check" CHECK ("amountKobo" > 0);

ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_non_negative_balances_check" CHECK (
    "balanceBeforeKobo" >= 0
    AND "balanceAfterKobo" >= 0
);

ALTER TABLE "Product" ADD CONSTRAINT "Product_non_negative_money_and_stock_check" CHECK (
    "priceKobo" >= 0
    AND "stockQuantity" >= 0
);

ALTER TABLE "Category" ADD CONSTRAINT "Category_positive_level_check" CHECK ("level" > 0);

ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_positive_quantity_check" CHECK ("quantity" > 0);

ALTER TABLE "Order" ADD CONSTRAINT "Order_non_negative_totals_check" CHECK (
    "totalProductAmountKobo" >= 0
    AND "totalShippingFeeKobo" >= 0
    AND "totalServiceFeeKobo" >= 0
    AND "totalOrderAmountKobo" >= 0
);

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_positive_quantity_and_non_negative_money_check" CHECK (
    "quantity" > 0
    AND "unitPriceAtCheckoutKobo" >= 0
    AND "productAmountKobo" >= 0
    AND "shippingFeeKobo" >= 0
    AND "serviceFeeKobo" >= 0
    AND "netEscrowAmountKobo" >= 0
);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_positive_amount_check" CHECK ("amountKobo" > 0);

ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_non_negative_amounts_check" CHECK (
    "grossAmountKobo" >= 0
    AND "sellerNetAmountKobo" >= 0
    AND "platformFeeKobo" >= 0
    AND "shippingFeeKobo" >= 0
);

ALTER TABLE "PayoutBatch" ADD CONSTRAINT "PayoutBatch_non_negative_totals_check" CHECK (
    "totalAmountKobo" >= 0
    AND "sellerCount" >= 0
);

ALTER TABLE "PayoutRecord" ADD CONSTRAINT "PayoutRecord_positive_amount_check" CHECK ("amountKobo" > 0);

CREATE UNIQUE INDEX "Dispute_one_active_per_order_item_key"
ON "Dispute"("orderItemId")
WHERE "status" IN (
    'OPEN'::"DisputeStatus",
    'UNDER_REVIEW'::"DisputeStatus",
    'AWAITING_BUYER_RETURN'::"DisputeStatus",
    'RETURN_IN_TRANSIT'::"DisputeStatus"
);
