import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
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
}
