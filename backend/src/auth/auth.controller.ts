import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { ApiResponse } from '../common/response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateMarketingConsentDto } from './dto/update-marketing-consent.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return ApiResponse.ok(user, 'Registered successfully');
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login — returns access token + refreshToken, sets httpOnly refresh cookie' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    // refreshToken is also returned in the body so native mobile clients
    // (which cannot read httpOnly cookies) can store it in the device keychain.
    return ApiResponse.ok(
      { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user },
      'Logged in',
    );
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Public()
  @Post('refresh-mobile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate tokens using refresh token in request body (mobile clients)' })
  async refreshMobile(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new (await import('@nestjs/common').then((m) => m.BadRequestException))('refreshToken is required');
    }
    const result = await this.authService.refreshTokensByValue(body.refreshToken);
    return ApiResponse.ok(
      { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user },
      'Token refreshed',
    );
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Public()
  @Post('login/mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Begin MFA login — verifies password, skips OTP if device is trusted' })
  async loginMfa(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithMfa(dto);
    if (result.trusted) {
      this.setRefreshCookie(res, result.refreshToken);
      return ApiResponse.ok({ trusted: true, accessToken: result.accessToken, user: result.user }, 'Logged in');
    }
    return ApiResponse.ok({ trusted: false, ...result }, 'OTP sent to your email');
  }

  @Public()
  @Post('login/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete MFA login by verifying the emailed OTP' })
  async verifyLoginOtp(
    @Body() body: { challenge: string; code: string; trustDevice?: boolean },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyLoginOtp(body.challenge, body.code, body.trustDevice);
    this.setRefreshCookie(res, result.refreshToken);
    return ApiResponse.ok({ accessToken: result.accessToken, user: result.user, deviceToken: result.deviceToken }, 'Verified');
  }

  @Public()
  @Post('login/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend the MFA OTP (respects 30s cooldown)' })
  async resendLoginOtp(@Body() body: { challenge: string }) {
    const result = await this.authService.resendLoginOtp(body.challenge);
    return ApiResponse.ok(result, 'New code sent');
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate access token using httpOnly refresh cookie' })
  async refresh(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldToken = req.cookies?.['refresh_token'];
    const result = await this.authService.refreshTokens(user.sub, oldToken);
    this.setRefreshCookie(res, result.refreshToken);
    return ApiResponse.ok(
      { accessToken: result.accessToken, user: result.user },
      'Token refreshed',
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke refresh token and clear cookie' })
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.['refresh_token'];
    if (token) await this.authService.logout(user.id, token);
    res.clearCookie('refresh_token');
    return ApiResponse.ok(null, 'Logged out');
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: any) {
    return ApiResponse.ok(user, 'Current user');
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full profile of current user' })
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.authService.getProfile(user.id);
    return ApiResponse.ok(profile, 'User profile');
  }

  @Post('profile') // Need PATCH or POST, Post is fine but let's use PATCH
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    const profile = await this.authService.updateProfile(user.id, dto);
    return ApiResponse.ok(profile, 'Profile updated');
  }

  @Throttle({ default: { ttl: 3600000, limit: 3 } })  // 3 per hour — prevent email bombing
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return ApiResponse.ok(null, 'If the email exists, a reset link has been sent');
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return ApiResponse.ok(null, 'Password has been reset successfully');
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user.id, dto);
    return ApiResponse.ok(null, 'Password changed successfully');
  }

  @Delete('account')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permanently delete own account (KVKK Art. 11 right to erasure)' })
  async deleteAccount(@CurrentUser() user: any, @Body() dto: DeleteAccountDto) {
    await this.authService.deleteAccount(user.id, dto.password);
    return ApiResponse.ok(null, 'Account deleted');
  }

  @Patch('marketing-consent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update marketing consent preference' })
  async updateMarketingConsent(@CurrentUser() user: any, @Body() dto: UpdateMarketingConsentDto) {
    const result = await this.authService.updateMarketingConsent(user.id, dto.consent);
    return ApiResponse.ok(result, 'Marketing consent updated');
  }

  private setRefreshCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProd,
      // 'none' is required for cross-domain (Vercel frontend ↔ Railway backend)
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
