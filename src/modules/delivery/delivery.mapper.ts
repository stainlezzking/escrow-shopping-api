import {
  DeliveryQuote,
  DeliveryShipment,
  DeliveryStatus,
} from '@prisma/client';
import {
  DeliveryQuoteResponseDto,
  DeliveryShipmentResponseDto,
  DeliveryTrackingResponseDto,
} from './dto/delivery-response.dto';
import { DeliveryTrackingResult } from './providers/delivery-provider.interface';

/**
 * Maps stored delivery quote snapshots to API responses.
 *
 * @param quote - Delivery quote record.
 * @returns Public-safe delivery quote response.
 */
export function mapDeliveryQuote(
  quote: DeliveryQuote,
): DeliveryQuoteResponseDto {
  return {
    id: quote.id,
    provider: quote.provider,
    quotedFeeKobo: quote.quotedFeeKobo.toString(),
    dropoffState: quote.dropoffState,
    dropoffCity: quote.dropoffCity,
    dropoffAddress: quote.dropoffAddress,
    vehicle: quote.vehicle,
    expiresAt: quote.expiresAt,
  };
}

/**
 * Maps delivery shipment records to API responses.
 *
 * @param shipment - Delivery shipment record.
 * @returns Public-safe delivery shipment response.
 */
export function mapDeliveryShipment(
  shipment: DeliveryShipment,
): DeliveryShipmentResponseDto {
  return {
    id: shipment.id,
    orderItemId: shipment.orderItemId,
    provider: shipment.provider,
    status: shipment.status,
    deliveryFeeKobo: shipment.deliveryFeeKobo.toString(),
    trackingReference: shipment.trackingReference,
    packageTrackingReference: shipment.packageTrackingReference,
    bookedAt: shipment.bookedAt,
  };
}

/**
 * Maps provider tracking results to API responses.
 *
 * @param tracking - Provider-neutral tracking result.
 * @returns Public tracking response.
 */
export function mapDeliveryTracking(
  tracking: DeliveryTrackingResult,
): DeliveryTrackingResponseDto {
  return {
    status: tracking.status ?? DeliveryStatus.PENDING,
    providerStatus: tracking.providerStatus ?? null,
    description: tracking.description ?? null,
    location: tracking.location ?? null,
  };
}
