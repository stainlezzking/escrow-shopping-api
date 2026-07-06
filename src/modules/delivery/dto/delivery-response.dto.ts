import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryProvider, DeliveryStatus } from '@prisma/client';

/**
 * Provider location option shown to frontend selectors.
 */
export class DeliveryLocationOptionDto {
  @ApiProperty({ example: '25' })
  id: string;

  @ApiProperty({ example: 'Lagos' })
  name: string;
}

/**
 * Provider carrier option shown to frontend selectors.
 */
export class DeliveryCarrierOptionDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'Dellyman Bike' })
  name: string;
}

/**
 * Stored delivery quote response.
 */
export class DeliveryQuoteResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ enum: DeliveryProvider, example: DeliveryProvider.DELLYMAN })
  provider: DeliveryProvider;

  @ApiProperty({
    example: '250000',
    description: 'Quoted delivery fee in kobo.',
  })
  quotedFeeKobo: string;

  @ApiProperty({ example: 'Lagos' })
  dropoffState: string;

  @ApiPropertyOptional({ example: 'Ikeja', nullable: true })
  dropoffCity: string | null;

  @ApiProperty({ example: '12 Allen Avenue, Ikeja, Lagos' })
  dropoffAddress: string;

  @ApiPropertyOptional({ example: 'Bike', nullable: true })
  vehicle: string | null;

  @ApiPropertyOptional({ nullable: true })
  expiresAt: Date | null;
}

/**
 * Delivery shipment response.
 */
export class DeliveryShipmentResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '650e8400-e29b-41d4-a716-446655440000' })
  orderItemId: string;

  @ApiProperty({ enum: DeliveryProvider, example: DeliveryProvider.DELLYMAN })
  provider: DeliveryProvider;

  @ApiProperty({ enum: DeliveryStatus, example: DeliveryStatus.BOOKED })
  status: DeliveryStatus;

  @ApiProperty({ example: '250000' })
  deliveryFeeKobo: string;

  @ApiPropertyOptional({ example: 'DM-12345', nullable: true })
  trackingReference: string | null;

  @ApiPropertyOptional({ example: 'PKG-12345', nullable: true })
  packageTrackingReference: string | null;

  @ApiPropertyOptional({ nullable: true })
  bookedAt: Date | null;
}

/**
 * Delivery tracking response.
 */
export class DeliveryTrackingResponseDto {
  @ApiProperty({ enum: DeliveryStatus, example: DeliveryStatus.PICKED_UP })
  status: DeliveryStatus;

  @ApiPropertyOptional({ example: 'Picked Up', nullable: true })
  providerStatus: string | null;

  @ApiPropertyOptional({ example: 'Rider picked package', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ example: 'Lagos', nullable: true })
  location: string | null;
}
