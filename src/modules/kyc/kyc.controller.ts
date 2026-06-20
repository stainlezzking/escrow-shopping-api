import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { KycDocumentResponseDto } from './dto/kyc-document-response.dto';
import {
  KycDocumentParamsSchema,
  RejectKycDocumentDto,
  RejectKycDocumentSchema,
  SellerProfileParamsSchema,
  SubmitKycDocumentDto,
  SubmitKycDocumentSchema,
} from './dto/kyc.dto';
import type {
  KycDocumentParamsInput,
  RejectKycDocumentInput,
  SellerProfileParamsInput,
  SubmitKycDocumentInput,
} from './dto/kyc.dto';
import { KycService } from './kyc.service';

/**
 * Handles seller KYC submissions and admin KYC review routes.
 */
@ApiTags('KYC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  /**
   * Submits KYC document metadata for a seller-owned store.
   *
   * @param user - Authenticated seller payload.
   * @param params - Validated seller profile route params.
   * @param dto - Validated KYC document metadata.
   * @returns Safe KYC document response.
   */
  @Post('seller-profiles/:sellerProfileId/documents')
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: 'Submit seller KYC document metadata' })
  @ApiParam({ name: 'sellerProfileId', description: 'Seller profile ID' })
  @ApiBody({ type: SubmitKycDocumentDto })
  @ApiCreatedResponse({ type: KycDocumentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({
    description: 'Seller profile belongs to another user',
  })
  @ApiNotFoundResponse({ description: 'Seller profile not found' })
  submitDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(SellerProfileParamsSchema))
    params: SellerProfileParamsInput,
    @Body(new ZodValidationPipe(SubmitKycDocumentSchema))
    dto: SubmitKycDocumentInput,
  ): Promise<KycDocumentResponseDto> {
    return this.kycService.submitDocument(
      user.sub,
      params.sellerProfileId,
      dto,
    );
  }

  /**
   * Lists KYC submissions for a seller-owned store.
   *
   * @param user - Authenticated seller payload.
   * @param params - Validated seller profile route params.
   * @returns Safe KYC document responses.
   */
  @Get('seller-profiles/:sellerProfileId/documents')
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: 'List own seller KYC submissions' })
  @ApiParam({ name: 'sellerProfileId', description: 'Seller profile ID' })
  @ApiOkResponse({ type: KycDocumentResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({
    description: 'Seller profile belongs to another user',
  })
  @ApiNotFoundResponse({ description: 'Seller profile not found' })
  listOwnSubmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(SellerProfileParamsSchema))
    params: SellerProfileParamsInput,
  ): Promise<KycDocumentResponseDto[]> {
    return this.kycService.listOwnSubmissions(user.sub, params.sellerProfileId);
  }

  /**
   * Approves a seller KYC document as an admin.
   *
   * @param user - Authenticated admin payload.
   * @param params - Validated KYC document route params.
   * @returns Safe KYC document response.
   */
  @Patch('admin/documents/:documentId/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve seller KYC document' })
  @ApiParam({ name: 'documentId', description: 'KYC document ID' })
  @ApiOkResponse({ type: KycDocumentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'KYC document not found' })
  approveDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(KycDocumentParamsSchema))
    params: KycDocumentParamsInput,
  ): Promise<KycDocumentResponseDto> {
    return this.kycService.approveDocument({
      adminUserId: user.sub,
      adminRole: user.role,
      documentId: params.documentId,
    });
  }

  /**
   * Rejects a seller KYC document as an admin.
   *
   * @param user - Authenticated admin payload.
   * @param params - Validated KYC document route params.
   * @param dto - Validated rejection reason.
   * @returns Safe KYC document response.
   */
  @Patch('admin/documents/:documentId/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject seller KYC document' })
  @ApiParam({ name: 'documentId', description: 'KYC document ID' })
  @ApiBody({ type: RejectKycDocumentDto })
  @ApiOkResponse({ type: KycDocumentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'KYC document not found' })
  rejectDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(KycDocumentParamsSchema))
    params: KycDocumentParamsInput,
    @Body(new ZodValidationPipe(RejectKycDocumentSchema))
    dto: RejectKycDocumentInput,
  ): Promise<KycDocumentResponseDto> {
    return this.kycService.rejectDocument({
      adminUserId: user.sub,
      adminRole: user.role,
      documentId: params.documentId,
      reason: dto.reason,
    });
  }
}
