import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  DeliveryBookingRequest,
  DeliveryBookingResult,
  DeliveryCarrierOption,
  DeliveryLocationOption,
  DeliveryProviderPort,
  DeliveryQuoteRequest,
  DeliveryQuoteResult,
  DeliveryTrackingResult,
} from './delivery-provider.interface';

interface DeliveryConfig {
  dellymanBaseUrl: string;
  dellymanApiKey: string;
  dellymanWebhookSecret: string;
  defaultPickupWindow: string;
}

/**
 * Dellyman REST API adapter behind the delivery provider port.
 */
@Injectable()
export class DellymanDeliveryProvider implements DeliveryProviderPort {
  private readonly logger = new Logger(DellymanDeliveryProvider.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Lists Dellyman-supported states.
   *
   * @returns Provider-normalized state options.
   */
  async listStates(): Promise<DeliveryLocationOption[]> {
    const response = await this.request<unknown>('GET', '/States');
    return this.extractArray(response).map((state) => ({
      id: this.pickString(state, ['id', 'state_id', 'StateID', 'value']),
      name: this.pickString(state, [
        'name',
        'state_name',
        'StateName',
        'label',
      ]),
    }));
  }

  /**
   * Lists cities under a Dellyman state.
   *
   * @param stateId - Dellyman state identifier.
   * @returns Provider-normalized city options.
   */
  async listCities(stateId: string): Promise<DeliveryLocationOption[]> {
    const response = await this.request<unknown>('POST', '/Cities', {
      StateID: stateId,
    });
    return this.extractArray(response).map((city) => ({
      id: this.pickString(city, ['id', 'city_id', 'CityID', 'value']),
      name: this.pickString(city, ['name', 'city_name', 'CityName', 'label']),
    }));
  }

  /**
   * Lists Dellyman delivery carriers or company options.
   *
   * @returns Provider-normalized carrier options.
   */
  async listCarriers(): Promise<DeliveryCarrierOption[]> {
    const response = await this.request<unknown>('GET', '/Vehicles');
    return this.extractArray(response).map((carrier) => ({
      id: this.pickString(carrier, ['id', 'company_id', 'CompanyID', 'value']),
      name: this.pickString(carrier, [
        'name',
        'company_name',
        'CompanyName',
        'label',
      ]),
    }));
  }

  /**
   * Requests a delivery quote from Dellyman.
   *
   * @param input - Provider-neutral quote request.
   * @returns Normalized quote result in kobo.
   */
  async getQuote(input: DeliveryQuoteRequest): Promise<DeliveryQuoteResult> {
    const response = await this.request<Record<string, unknown>>(
      'POST',
      '/GetQuotes',
      {
        PaymentMode: 'online',
        PickupAddress: input.pickupAddress,
        DeliveryAddress: [input.dropoffAddress],
        Vehicle: input.vehicle,
        IsInstantDelivery: 0,
        IsProductOrder: 0,
        ProductAmount: [],
        PickupRequestedDate: this.formatDate(new Date()),
        PickupRequestedTime: this.config.defaultPickupWindow,
      },
    );
    const data = this.unwrapData(response);
    const company = this.pickQuoteCompany(response);
    const amountNaira = this.pickNumber(company ?? data, [
      'PayableAmount',
      'TotalPrice',
      'SameDayPrice',
      'OriginalPrice',
      'amount',
      'Amount',
      'total',
      'Total',
      'price',
      'Price',
      'delivery_fee',
      'DeliveryFee',
    ]);

    return {
      amountKobo: BigInt(Math.round(amountNaira * 100)),
      providerQuoteReference: this.pickOptionalString(data, [
        'quote_id',
        'QuoteID',
        'reference',
        'Reference',
      ]),
      providerCompanyId: this.pickOptionalString(company ?? data, [
        'company_id',
        'CompanyID',
      ]),
      providerCompanyName: this.pickOptionalString(company ?? data, [
        'company_name',
        'CompanyName',
        'Name',
      ]),
      vehicle: this.pickOptionalString(data, ['vehicle', 'Vehicle']),
      metadata: response,
    };
  }

  /**
   * Books a Dellyman delivery after seller readiness.
   *
   * @param input - Provider-neutral booking request.
   * @returns Normalized booking result.
   */
  async bookDelivery(
    input: DeliveryBookingRequest,
  ): Promise<DeliveryBookingResult> {
    const response = await this.request<Record<string, unknown>>(
      'POST',
      '/BookOrder',
      {
        OrderID: input.orderReference,
        OrderRef: input.orderItemId,
        CompanyID: input.providerCompanyId,
        PaymentMode: 'online',
        PickUpContactName: input.pickupContactName,
        PickUpContactNumber: input.pickupContactPhone,
        PickUpGooglePlaceAddress: input.pickupAddress,
        PickUpLandmark: 'N/A',
        IsProductOrder: 0,
        IsInstantDelivery: 0,
        PickUpRequestedDate: this.formatDate(new Date()),
        PickUpRequestedTime: this.config.defaultPickupWindow,
        DeliveryRequestedTime: this.config.defaultPickupWindow,
        DeliveryTimeline: 'sameDay',
        Vehicle: input.vehicle,
        Packages: [
          {
            PackageDescription: input.packageDescription,
            DeliveryContactName: input.receiverName,
            DeliveryContactNumber: input.receiverPhone,
            PackageWeight: input.weightKg ?? 1,
            DeliveryGooglePlaceAddress: input.dropoffAddress,
            DeliveryLandmark: 'N/A',
            ProductAmount: 0,
          },
        ],
      },
    );
    const data = this.unwrapData(response);

    return {
      providerShipmentReference: this.pickOptionalString(data, [
        'order_id',
        'OrderID',
        'reference',
        'Reference',
      ]),
      providerOrderId: this.pickOptionalString(data, ['order_id', 'OrderID']),
      providerOrderCode: this.pickOptionalString(data, [
        'order_code',
        'OrderCode',
      ]),
      providerPackageId: this.pickOptionalString(data, [
        'package_id',
        'PackageID',
      ]),
      trackingReference: this.pickOptionalString(data, [
        'tracking_code',
        'TrackingCode',
        'tracking_reference',
      ]),
      packageTrackingReference: this.pickOptionalString(data, [
        'package_tracking_code',
        'PackageTrackingCode',
      ]),
      status: DeliveryStatus.BOOKED,
      metadata: response,
    };
  }

  /**
   * Tracks a Dellyman delivery reference.
   *
   * @param reference - Provider tracking/order reference.
   * @returns Normalized tracking event result.
   */
  async trackDelivery(reference: string): Promise<DeliveryTrackingResult> {
    const response = await this.request<Record<string, unknown>>(
      'POST',
      '/TrackOrder',
      { TrackingID: reference },
    );

    return this.mapTrackingPayload(response);
  }

  /**
   * Maps a Dellyman webhook payload into the internal delivery event shape.
   *
   * @param payload - Parsed provider webhook payload.
   * @returns Normalized tracking event.
   */
  mapWebhook(payload: Record<string, unknown>): DeliveryTrackingResult {
    return this.mapTrackingPayload(payload);
  }

  /**
   * Verifies Dellyman webhook signatures using HMAC-SHA256 over the raw body.
   *
   * @param payload - Parsed webhook payload.
   * @param signature - X-Dellyman-Signature header value.
   * @param rawBody - Raw request body captured by Nest.
   * @returns True when the signature matches the configured webhook secret.
   */
  verifyWebhookSignature(
    _payload: Record<string, unknown>,
    signature: string,
    rawBody?: Buffer | string,
  ): boolean {
    const { dellymanWebhookSecret } = this.config;

    if (!dellymanWebhookSecret || !signature || !rawBody) {
      return false;
    }

    const expected = createHmac('sha256', dellymanWebhookSecret)
      .update(rawBody)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  private get config(): DeliveryConfig {
    return this.configService.getOrThrow<DeliveryConfig>('delivery');
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const config = this.config;
    const url = `${config.dellymanBaseUrl.replace(/\/+$/, '')}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.dellymanApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException(
        'Delivery provider authentication failed',
      );
    }

    const payload = (await response.json().catch(() => ({}))) as T;

    if (!response.ok) {
      this.logger.warn(`Dellyman request failed: ${response.status} ${path}`);
      throw new ServiceUnavailableException('Delivery provider request failed');
    }

    return payload;
  }

  private mapTrackingPayload(
    payload: Record<string, unknown>,
  ): DeliveryTrackingResult {
    const data = this.unwrapDeliveryPayload(payload);
    const providerStatus = this.pickOptionalString(data, [
      'status',
      'Status',
      'delivery_status',
      'DeliveryStatus',
      'OrderStatus',
      'PackageStatus',
    ]);

    return {
      status: this.mapStatus(providerStatus),
      providerStatus,
      providerEventId: this.pickOptionalString(data, [
        'event_id',
        'EventID',
        'id',
        'OrderID',
        'PackageID',
      ]),
      occurredAt: this.pickDate(data, [
        'occurred_at',
        'created_at',
        'date',
        'PickedUpAt',
        'DeliveredAt',
        'CancelledAt',
        'AssignedAt',
      ]),
      location: this.pickOptionalString(data, ['location', 'Location']),
      description: this.pickOptionalString(data, [
        'description',
        'Description',
        'message',
      ]),
      payload,
    };
  }

  private mapStatus(providerStatus?: string): DeliveryStatus | undefined {
    const normalized = providerStatus?.toLowerCase() ?? '';
    if (normalized.includes('complete') || normalized.includes('deliver')) {
      return DeliveryStatus.ARRIVED_AT_DESTINATION;
    }
    if (normalized.includes('transit') || normalized.includes('pickup')) {
      return DeliveryStatus.PICKED_UP;
    }
    if (normalized.includes('assign')) return DeliveryStatus.PICKUP_PENDING;
    if (normalized.includes('book')) return DeliveryStatus.BOOKED;
    if (normalized.includes('cancel')) return DeliveryStatus.CANCELLED;
    if (normalized.includes('fail')) return DeliveryStatus.FAILED;
    if (normalized.includes('return')) return DeliveryStatus.RETURNED;
    return undefined;
  }

  private unwrapData(payload: unknown): Record<string, unknown> {
    if (!payload || typeof payload !== 'object') return {};
    const record = payload as Record<string, unknown>;
    const data = record.data ?? record.Data ?? record.result ?? record.Result;
    return data && typeof data === 'object'
      ? (data as Record<string, unknown>)
      : record;
  }

  private extractArray(payload: unknown): Record<string, unknown>[] {
    const data = this.unwrapData(payload);
    const record =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : {};
    const arrayValue = Array.isArray(payload)
      ? payload
      : Array.isArray(data)
        ? data
        : Array.isArray(record.Companies)
          ? record.Companies
          : Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.data)
              ? data.data
              : Object.values(data);
    return arrayValue.filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null,
    );
  }

  private pickQuoteCompany(
    payload: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const companies = Array.isArray(payload.Companies)
      ? payload.Companies
      : Array.isArray(payload.companies)
        ? payload.companies
        : [];

    return companies.find(
      (company): company is Record<string, unknown> =>
        typeof company === 'object' && company !== null,
    );
  }

  private unwrapDeliveryPayload(
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const order = payload.order;

    if (order && typeof order === 'object') {
      const orderRecord = order as Record<string, unknown>;
      const packages = orderRecord.Packages;
      const firstPackage: unknown = Array.isArray(packages)
        ? packages[0]
        : undefined;

      return firstPackage && typeof firstPackage === 'object'
        ? { ...orderRecord, ...(firstPackage as Record<string, unknown>) }
        : orderRecord;
    }

    return this.unwrapData(payload);
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '/');
  }

  private pickString(record: Record<string, unknown>, keys: string[]): string {
    return this.pickOptionalString(record, keys) ?? '';
  }

  private pickOptionalString(
    record: Record<string, unknown>,
    keys: string[],
  ): string | undefined {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value;
      if (typeof value === 'number') return String(value);
    }
    return undefined;
  }

  private pickNumber(record: Record<string, unknown>, keys: string[]): number {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim()) return Number(value);
    }
    return 0;
  }

  private pickDate(
    record: Record<string, unknown>,
    keys: string[],
  ): Date | undefined {
    const value = this.pickOptionalString(record, keys);
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}
