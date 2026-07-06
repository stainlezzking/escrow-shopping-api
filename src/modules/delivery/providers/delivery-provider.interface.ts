import { DeliveryStatus } from '@prisma/client';

export const DELIVERY_PROVIDER_PORT = Symbol('DELIVERY_PROVIDER_PORT');

export interface DeliveryLocationOption {
  id: string;
  name: string;
}

export interface DeliveryCarrierOption {
  id: string;
  name: string;
}

export interface DeliveryQuoteRequest {
  pickupAddress: string;
  pickupState?: string;
  pickupCity?: string;
  dropoffAddress: string;
  dropoffState: string;
  dropoffCity?: string;
  packageDescription: string;
  quantity: number;
  weightKg?: number;
  vehicle?: string;
}

export interface DeliveryQuoteResult {
  amountKobo: bigint;
  providerQuoteReference?: string;
  providerCompanyId?: string;
  providerCompanyName?: string;
  vehicle?: string;
  estimatedPickupAt?: Date;
  estimatedDeliveryAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface DeliveryBookingRequest extends DeliveryQuoteRequest {
  orderReference: string;
  orderItemId: string;
  deliveryFeeKobo: bigint;
  providerCompanyId?: string;
  receiverName: string;
  receiverPhone?: string;
  pickupContactName: string;
  pickupContactPhone?: string;
}

export interface DeliveryBookingResult {
  providerShipmentReference?: string;
  providerOrderId?: string;
  providerOrderCode?: string;
  providerPackageId?: string;
  trackingReference?: string;
  packageTrackingReference?: string;
  status: DeliveryStatus;
  metadata?: Record<string, unknown>;
}

export interface DeliveryTrackingResult {
  status?: DeliveryStatus;
  providerStatus?: string;
  providerEventId?: string;
  occurredAt?: Date;
  location?: string;
  description?: string;
  payload?: Record<string, unknown>;
}

/**
 * Provider-neutral delivery integration port.
 */
export interface DeliveryProviderPort {
  listStates(): Promise<DeliveryLocationOption[]>;
  listCities(stateId: string): Promise<DeliveryLocationOption[]>;
  listCarriers(): Promise<DeliveryCarrierOption[]>;
  getQuote(input: DeliveryQuoteRequest): Promise<DeliveryQuoteResult>;
  bookDelivery(input: DeliveryBookingRequest): Promise<DeliveryBookingResult>;
  trackDelivery(reference: string): Promise<DeliveryTrackingResult>;
  mapWebhook(payload: Record<string, unknown>): DeliveryTrackingResult;
  verifyWebhookSignature(
    payload: Record<string, unknown>,
    signature: string,
    rawBody?: Buffer | string,
  ): boolean;
}
