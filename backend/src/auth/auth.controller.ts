import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthorisedUser } from './decorators/authorised-user.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '@prisma/client';
import { Authorisation } from './decorators/authorisation.decorator';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RefreshDto } from './dto/refresh.dto';
import type {Response} from "express";

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  async googleAuth(@Body(ValidationPipe) googleAuthDto: GoogleAuthDto) {
    return this.authService.googleLogin(googleAuthDto);
  }

  // Google OAuth callback
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const result = await this.authService.googleLogin(req.user);

    // You can redirect to frontend with token or return JSON
    // For API usage, return JSON:
    return res.json(result);

    // For web app, redirect to frontend:
    // const frontendUrl = `${process.env.FRONTEND_URL}/auth/success?token=${result.access_token}`;
    // return res.redirect(frontendUrl);
  }

  // Alternative: Direct token exchange endpoint for mobile/SPA
  @Post('google/token')
  async googleTokenAuth(@Req() req) {
    // This would require additional validation of the Google token
    // For now, using the redirect flow above
    throw new Error('Not implemented - use /auth/google flow');
  }

  @Get('me')
  @Authorisation()
  async getProfile(@AuthorisedUser() user: User) {
    return user;
  }

  @Post('refresh')
  async refresh(@Body(ValidationPipe) refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Post('logout')
  @Authorisation()
  async logout() {
    // Refresh token управляется на фронте
    return { message: 'Logged out successfully' };
  }
}
