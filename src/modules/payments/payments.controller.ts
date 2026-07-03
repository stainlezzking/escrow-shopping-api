import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { PaymentProvider, UserRole } from '@prisma/client';
import type { Request } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  InitiatePaymentDto,
  InitiatePaymentSchema,
  PaymentParamsSchema,
  PaymentWebhookParamsSchema,
  PaymentWebhookSchema,
} from './dto/payment.dto';
import type {
  InitiatePaymentInput,
  PaymentParamsInput,
  PaymentWebhookInput,
  PaymentWebhookParamsInput,
} from './dto/payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentsService } from './payments.service';

/**
 * Handles payment initiation, verification, and provider webhooks.
 */
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Initiates payment for a backend-created pending order.
   */
  @Post('initiate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.SELLER)
  @ApiOperation({ summary: 'Initiate payment for pending order' })
  @ApiBody({ type: InitiatePaymentDto })
  @ApiCreatedResponse({ type: PaymentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiUnprocessableEntityResponse({
    description: 'Order is not payable or provider is not configured',
  })
  initiatePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(InitiatePaymentSchema))
    dto: InitiatePaymentInput,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.initiatePayment(user.sub, dto);
  }

  /**
   * Verifies payment status directly with the configured provider.
   */
  @Post(':paymentId/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.SELLER)
  @ApiOperation({ summary: 'Verify payment server-side' })
  @ApiParam({ name: 'paymentId', description: 'Payment attempt ID' })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  verifyPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(PaymentParamsSchema))
    params: PaymentParamsInput,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.verifyPayment(user.sub, params.paymentId);
  }

  /**
   * Receives provider webhook callbacks after signature verification.
   */
  @Post('webhooks/:provider')
  @ApiOperation({ summary: 'Handle payment provider webhook' })
  @ApiParam({ name: 'provider', enum: PaymentProvider })
  @ApiOkResponse({ type: PaymentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid provider signature' })
  handleWebhook(
    @Param(new ZodValidationPipe(PaymentWebhookParamsSchema))
    params: PaymentWebhookParamsInput,
    @Body(new ZodValidationPipe(PaymentWebhookSchema))
    payload: PaymentWebhookInput,
    @Headers('x-paystack-signature') signature = '',
    @Req() request: Request & { rawBody?: Buffer },
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.handleWebhook(
      params.provider,
      payload,
      signature,
      request.rawBody,
    );
  }
}
