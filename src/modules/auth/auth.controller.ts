import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto, PublicUserDto } from './dto/auth-response.dto';
import { LoginDto, LoginSchema } from './dto/login.dto';
import type { LoginInput } from './dto/login.dto';
import { RegisterDto, RegisterSchema } from './dto/register.dto';
import type { RegisterInput } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './types/authenticated-user';

/**
 * Handles authentication routes for registration, login, and current user.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Registers a buyer account.
   *
   * @param dto - Validated registration payload.
   * @returns Auth payload with access token and public user details.
   */
  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  @ApiOperation({ summary: 'Register a buyer account' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'Email is already registered' })
  register(@Body() dto: RegisterInput): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * Logs in a user with email and password.
   *
   * @param dto - Validated login payload.
   * @returns Auth payload with access token and public user details.
   */
  @Post('login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  login(@Body() dto: LoginInput): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * Returns the authenticated current user.
   *
   * @param user - Authenticated JWT payload.
   * @returns Public current user details.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<PublicUserDto> {
    return this.usersService.findCurrentUser(user.sub);
  }
}
