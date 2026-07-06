import { registerAs } from '@nestjs/config';
import { DeliveryProvider } from '@prisma/client';

/**
 * Central delivery provider configuration namespace.
 */
export default registerAs('delivery', () => ({
  provider: process.env.DELIVERY_PROVIDER ?? DeliveryProvider.DELLYMAN,
  dellymanBaseUrl:
    process.env.DELLYMAN_BASE_URL ?? 'https://dev.dellyman.com/api/v3.0',
  dellymanApiKey: process.env.DELLYMAN_API_KEY ?? '',
  dellymanWebhookSecret: process.env.DELLYMAN_WEBHOOK_SECRET ?? '',
  defaultVehicle: process.env.DELIVERY_DEFAULT_VEHICLE ?? 'Bike',
  defaultPickupWindow:
    process.env.DELIVERY_DEFAULT_PICKUP_WINDOW ?? '08:00 AM to 05:00 PM',
  quoteTtlMinutes: Number(process.env.DELIVERY_QUOTE_TTL_MINUTES ?? 30),
}));
