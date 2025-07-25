import {Controller, Get, Post, UseGuards, Req, Res, Body, ValidationPipe} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { User } from './decorators/user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {RegisterDto} from "./dto/register.dto";
import {LoginDto} from "./dto/login.dto";

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    // ===== EMAIL/PASSWORD ENDPOINTS =====
    @Post('register')
    async register(@Body(ValidationPipe) registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    async login(@Body(ValidationPipe) loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    // Redirect to Google OAuth
    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth() {
        // Initiates the Google OAuth2 login flow
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

    // Get current user profile
    @Get('profile')
    @UseGuards(JwtAuthGuard)
    async getProfile(@User() user) {
        return user;
    }

    // Alternative: Direct token exchange endpoint for mobile/SPA
    @Post('google/token')
    async googleTokenAuth(@Req() req) {
        // This would require additional validation of the Google token
        // For now, using the redirect flow above
        throw new Error('Not implemented - use /auth/google flow');
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    async logout() {
        // В JWT logout происходит на клиенте (удаление токена)
        return { message: 'Logged out successfully' };
    }
}
