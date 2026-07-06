-- CreateEnum
CREATE TYPE "DeliveryProvider" AS ENUM ('DELLYMAN', 'SELLER_MANAGED');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('THIRD_PARTY_PROVIDER', 'SELLER_MANAGED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'QUOTE_REQUESTED', 'QUOTE_ACCEPTED', 'BOOKED', 'PICKUP_PENDING', 'PICKED_UP', 'ARRIVED_AT_DESTINATION', 'DELIVERED_ACCEPTED', 'DELIVERED_REJECTED', 'RETURN_PENDING', 'RETURNED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "deliveryQuoteId" TEXT;

-- CreateTable
CREATE TABLE "DeliveryQuote" (
    "id" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "productId" TEXT,
    "sellerProfileId" TEXT,
    "provider" "DeliveryProvider" NOT NULL,
    "providerQuoteReference" TEXT,
    "providerCompanyId" TEXT,
    "providerCompanyName" TEXT,
    "vehicle" TEXT,
    "pickupState" TEXT,
    "pickupCity" TEXT,
    "pickupAddress" TEXT,
    "dropoffState" TEXT NOT NULL,
    "dropoffCity" TEXT,
    "dropoffAddress" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "packageWeightKg" DOUBLE PRECISION,
    "quotedFeeKobo" BIGINT NOT NULL,
    "estimatedPickupAt" TIMESTAMP(3),
    "estimatedDeliveryAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryShipment" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "provider" "DeliveryProvider" NOT NULL,
    "method" "DeliveryMethod" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerShipmentReference" TEXT,
    "providerOrderId" TEXT,
    "providerOrderCode" TEXT,
    "providerPackageId" TEXT,
    "trackingReference" TEXT,
    "packageTrackingReference" TEXT,
    "deliveryFeeKobo" BIGINT NOT NULL,
    "pickupAddressSnapshot" JSONB,
    "dropoffAddressSnapshot" JSONB,
    "readyForPickupAt" TIMESTAMP(3),
    "bookedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "arrivedAtDestinationAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryEvent" (
    "id" TEXT NOT NULL,
    "deliveryShipmentId" TEXT NOT NULL,
    "provider" "DeliveryProvider" NOT NULL,
    "providerEventId" TEXT,
    "providerStatus" TEXT,
    "internalStatus" "DeliveryStatus",
    "occurredAt" TIMESTAMP(3),
    "location" TEXT,
    "description" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryQuote_buyerProfileId_idx" ON "DeliveryQuote"("buyerProfileId");

-- CreateIndex
CREATE INDEX "DeliveryQuote_productId_idx" ON "DeliveryQuote"("productId");

-- CreateIndex
CREATE INDEX "DeliveryQuote_sellerProfileId_idx" ON "DeliveryQuote"("sellerProfileId");

-- CreateIndex
CREATE INDEX "DeliveryQuote_provider_idx" ON "DeliveryQuote"("provider");

-- CreateIndex
CREATE INDEX "DeliveryQuote_providerQuoteReference_idx" ON "DeliveryQuote"("providerQuoteReference");

-- CreateIndex
CREATE INDEX "DeliveryQuote_expiresAt_idx" ON "DeliveryQuote"("expiresAt");

-- CreateIndex
CREATE INDEX "DeliveryQuote_createdAt_idx" ON "DeliveryQuote"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryShipment_orderItemId_key" ON "DeliveryShipment"("orderItemId");

-- CreateIndex
CREATE INDEX "DeliveryShipment_provider_idx" ON "DeliveryShipment"("provider");

-- CreateIndex
CREATE INDEX "DeliveryShipment_method_idx" ON "DeliveryShipment"("method");

-- CreateIndex
CREATE INDEX "DeliveryShipment_status_idx" ON "DeliveryShipment"("status");

-- CreateIndex
CREATE INDEX "DeliveryShipment_providerShipmentReference_idx" ON "DeliveryShipment"("providerShipmentReference");

-- CreateIndex
CREATE INDEX "DeliveryShipment_trackingReference_idx" ON "DeliveryShipment"("trackingReference");

-- CreateIndex
CREATE INDEX "DeliveryShipment_packageTrackingReference_idx" ON "DeliveryShipment"("packageTrackingReference");

-- CreateIndex
CREATE INDEX "DeliveryShipment_readyForPickupAt_idx" ON "DeliveryShipment"("readyForPickupAt");

-- CreateIndex
CREATE INDEX "DeliveryShipment_createdAt_idx" ON "DeliveryShipment"("createdAt");

-- CreateIndex
CREATE INDEX "DeliveryEvent_deliveryShipmentId_idx" ON "DeliveryEvent"("deliveryShipmentId");

-- CreateIndex
CREATE INDEX "DeliveryEvent_provider_idx" ON "DeliveryEvent"("provider");

-- CreateIndex
CREATE INDEX "DeliveryEvent_providerEventId_idx" ON "DeliveryEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "DeliveryEvent_internalStatus_idx" ON "DeliveryEvent"("internalStatus");

-- CreateIndex
CREATE INDEX "DeliveryEvent_occurredAt_idx" ON "DeliveryEvent"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryEvent_provider_providerEventId_key" ON "DeliveryEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "OrderItem_deliveryQuoteId_idx" ON "OrderItem"("deliveryQuoteId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_deliveryQuoteId_fkey" FOREIGN KEY ("deliveryQuoteId") REFERENCES "DeliveryQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryQuote" ADD CONSTRAINT "DeliveryQuote_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryQuote" ADD CONSTRAINT "DeliveryQuote_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryQuote" ADD CONSTRAINT "DeliveryQuote_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryShipment" ADD CONSTRAINT "DeliveryShipment_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryEvent" ADD CONSTRAINT "DeliveryEvent_deliveryShipmentId_fkey" FOREIGN KEY ("deliveryShipmentId") REFERENCES "DeliveryShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
