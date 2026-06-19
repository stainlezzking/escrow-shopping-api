import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleIdentityVerifierService } from './google-identity-verifier.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PasswordHasherService } from './password-hasher.service';

interface AuthConfig {
  jwtAccessTokenSecret: string;
  jwtAccessTokenExpiresIn: string;
}

/**
 * Feature module for authentication, JWT access, and role guards.
 */
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authConfig = configService.getOrThrow<AuthConfig>('auth');

        return {
          secret: authConfig.jwtAccessTokenSecret,
          signOptions: {
            expiresIn:
              authConfig.jwtAccessTokenExpiresIn as SignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleIdentityVerifierService,
    PasswordHasherService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
