import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { EscrowReleaseResponseDto } from '../escrow/dto/escrow-release-response.dto';
import { ConfirmOrderItemParamsSchema } from './dto/confirm-order-item.dto';
import type { ConfirmOrderItemParamsInput } from './dto/confirm-order-item.dto';
import {
  DispatchOrderItemDto,
  DispatchOrderItemParamsSchema,
  DispatchOrderItemSchema,
} from './dto/dispatch-order-item.dto';
import type {
  DispatchOrderItemInput,
  DispatchOrderItemParamsInput,
} from './dto/dispatch-order-item.dto';
import { DispatchOrderItemResponseDto } from './dto/dispatch-response.dto';
import {
  InitializeOrderDto,
  InitializeOrderSchema,
} from './dto/initialize-order.dto';
import type { InitializeOrderInput } from './dto/initialize-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

/**
 * Handles order initialization routes.
 */
@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Initializes a pending-payment order from client-side cart items.
   */
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.SELLER)
  @ApiOperation({ summary: 'Initialize order before payment' })
  @ApiBody({ type: InitializeOrderDto })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiUnprocessableEntityResponse({
    description: 'One or more products are unavailable for checkout',
  })
  initializeOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(InitializeOrderSchema))
    dto: InitializeOrderInput,
  ): Promise<OrderResponseDto> {
    return this.ordersService.initializeOrder(user.sub, dto);
  }

  /**
   * Stores seller dispatch evidence and starts the safety timer.
   */
  @Post(':orderId/items/:itemId/dispatch')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: 'Dispatch seller order item' })
  @ApiParam({ name: 'orderId', description: 'Parent order ID' })
  @ApiParam({ name: 'itemId', description: 'Order item ID' })
  @ApiBody({ type: DispatchOrderItemDto })
  @ApiCreatedResponse({ type: DispatchOrderItemResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Seller ownership required' })
  @ApiNotFoundResponse({ description: 'Order item not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Order item, payment, or escrow state does not allow dispatch',
  })
  dispatchOrderItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(DispatchOrderItemParamsSchema))
    params: DispatchOrderItemParamsInput,
    @Body(new ZodValidationPipe(DispatchOrderItemSchema))
    dto: DispatchOrderItemInput,
  ): Promise<DispatchOrderItemResponseDto> {
    return this.ordersService.dispatchOrderItem(
      user.sub,
      params.orderId,
      params.itemId,
      dto,
    );
  }

  /**
   * Confirms buyer delivery acceptance and releases escrow to seller.
   */
  @Post(':orderId/items/:itemId/confirm-delivery')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  @ApiOperation({ summary: 'Confirm buyer delivery acceptance' })
  @ApiParam({ name: 'orderId', description: 'Parent order ID' })
  @ApiParam({ name: 'itemId', description: 'Order item ID' })
  @ApiOkResponse({ type: EscrowReleaseResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Buyer ownership required' })
  @ApiNotFoundResponse({ description: 'Order item not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Order item or escrow state does not allow confirmation',
  })
  confirmOrderItemDelivery(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(ConfirmOrderItemParamsSchema))
    params: ConfirmOrderItemParamsInput,
  ): Promise<EscrowReleaseResponseDto> {
    return this.ordersService.confirmOrderItemDelivery(
      user.sub,
      params.orderId,
      params.itemId,
    );
  }
}
