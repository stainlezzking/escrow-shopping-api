import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { DeliveryService } from './delivery.service';
import {
  CreateDeliveryQuoteDto,
  CreateDeliveryQuoteSchema,
  DeliveryCitiesQuerySchema,
  DeliveryOrderItemParamsSchema,
  DeliveryTrackingParamsSchema,
  DeliveryWebhookSchema,
} from './dto/delivery.dto';
import type {
  CreateDeliveryQuoteInput,
  DeliveryCitiesQueryInput,
  DeliveryOrderItemParamsInput,
  DeliveryTrackingParamsInput,
  DeliveryWebhookInput,
} from './dto/delivery.dto';
import {
  DeliveryCarrierOptionDto,
  DeliveryLocationOptionDto,
  DeliveryQuoteResponseDto,
  DeliveryShipmentResponseDto,
  DeliveryTrackingResponseDto,
} from './dto/delivery-response.dto';

/**
 * Handles delivery selection, quotes, booking, tracking, and webhook routes.
 */
@ApiTags('Delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  /**
   * Lists provider-supported delivery states for frontend selectors.
   */
  @Get('states')
  @ApiOperation({ summary: 'List delivery states' })
  @ApiOkResponse({ type: DeliveryLocationOptionDto, isArray: true })
  listStates(): Promise<DeliveryLocationOptionDto[]> {
    return this.deliveryService.listStates();
  }

  /**
   * Lists provider-supported delivery cities for a state.
   */
  @Get('cities')
  @ApiOperation({ summary: 'List delivery cities by state' })
  @ApiQuery({ name: 'stateId', required: true })
  @ApiOkResponse({ type: DeliveryLocationOptionDto, isArray: true })
  listCities(
    @Query(new ZodValidationPipe(DeliveryCitiesQuerySchema))
    query: DeliveryCitiesQueryInput,
  ): Promise<DeliveryLocationOptionDto[]> {
    return this.deliveryService.listCities(query.stateId);
  }

  /**
   * Lists delivery carriers or company options exposed by the provider.
   */
  @Get('carriers')
  @ApiOperation({ summary: 'List delivery carriers' })
  @ApiOkResponse({ type: DeliveryCarrierOptionDto, isArray: true })
  listCarriers(): Promise<DeliveryCarrierOptionDto[]> {
    return this.deliveryService.listCarriers();
  }

  /**
   * Creates a delivery quote before order initialization and payment.
   */
  @Post('quotes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.SELLER)
  @ApiOperation({ summary: 'Create delivery quote before checkout' })
  @ApiBody({ type: CreateDeliveryQuoteDto })
  @ApiCreatedResponse({ type: DeliveryQuoteResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiNotFoundResponse({ description: 'Product or address not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Product is unavailable or provider quote failed',
  })
  createQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(CreateDeliveryQuoteSchema))
    dto: CreateDeliveryQuoteInput,
  ): Promise<DeliveryQuoteResponseDto> {
    return this.deliveryService.createQuote(user.sub, dto);
  }

  /**
   * Books provider delivery for a seller-owned order item.
   */
  @Post('order-items/:orderItemId/book')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: 'Book delivery for seller order item' })
  @ApiParam({ name: 'orderItemId', description: 'Order item ID' })
  @ApiCreatedResponse({ type: DeliveryShipmentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiNotFoundResponse({ description: 'Order item not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Order item is not eligible for delivery booking',
  })
  bookOrderItemDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(DeliveryOrderItemParamsSchema))
    params: DeliveryOrderItemParamsInput,
  ): Promise<DeliveryShipmentResponseDto> {
    return this.deliveryService.bookOrderItemDelivery(
      user.sub,
      params.orderItemId,
    );
  }

  /**
   * Tracks a stored delivery shipment through the provider.
   */
  @Get('shipments/:shipmentId/track')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Track delivery shipment' })
  @ApiParam({ name: 'shipmentId', description: 'Delivery shipment ID' })
  @ApiOkResponse({ type: DeliveryTrackingResponseDto })
  trackShipment(
    @Param(new ZodValidationPipe(DeliveryTrackingParamsSchema))
    params: DeliveryTrackingParamsInput,
  ): Promise<DeliveryTrackingResponseDto> {
    return this.deliveryService.trackShipment(params.shipmentId);
  }

  /**
   * Records provider delivery events from webhooks.
   */
  @Post('webhooks/dellyman')
  @ApiOperation({ summary: 'Handle Dellyman delivery webhook' })
  @ApiOkResponse({ type: DeliveryTrackingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid provider signature' })
  handleDellymanWebhook(
    @Body(new ZodValidationPipe(DeliveryWebhookSchema))
    payload: DeliveryWebhookInput,
    @Headers('x-dellyman-signature') signature = '',
    @Req() request: Request & { rawBody?: Buffer },
  ): Promise<DeliveryTrackingResponseDto> {
    return this.deliveryService.handleWebhook(
      payload,
      signature,
      request.rawBody,
    );
  }
}
