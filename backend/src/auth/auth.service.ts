import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from "./dto/register.dto";
import * as bcrypt from 'bcrypt';
import { LoginDto } from "./dto/login.dto";
import { GoogleUserDto } from "./dto/google-auth.dto";
import { Provider } from '@prisma/client';
import {ConfigService} from "@nestjs/config";
import {JwtPayload} from "./interfaces/jwt.interfaces";

@Injectable()
export class AuthService {
    private readonly JWT_ACCESS_TOKEN_TTL: string;
    private readonly JWT_REFRESH_TOKEN_TTL: string;

    constructor(
        private configService: ConfigService,
        private jwtService: JwtService,
        private userService: UserService,
    ) {
        this.JWT_ACCESS_TOKEN_TTL = this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_TTL') || '1h';
        this.JWT_REFRESH_TOKEN_TTL = this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_TTL') || '7d';
    }

    async register(registerDto: RegisterDto) {
        const { email, password, name } = registerDto;

        const existingUser = await this.userService.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await this.userService.create({
            email,
            name,
            password: hashedPassword,
            provider: Provider.EMAIL
        });

        return this.generateTokenResponse(user);
    }

    async login(loginDto: LoginDto) {
        const { email, password } = loginDto;

        const user = await this.userService.findByEmailWithPassword(email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (user.provider !== Provider.EMAIL || !user.password) {
            throw new UnauthorizedException('This email is registered with a different login method');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.generateTokenResponse(user);
    }

    async googleLogin(googleUser: GoogleUserDto) {
        // Find or create user
        let user = await this.userService.findByEmail(googleUser.email);

        if (!user) {
            user = await this.userService.create({
                email: googleUser.email,
                name: googleUser.name,
                avatarUrl: googleUser.picture,
                provider: 'GOOGLE' as Provider,
            });
        } else {
            // Update user info in case it changed
            user = await this.userService.update(user.id, {
                name: googleUser.name,
                avatarUrl: googleUser.picture,
            });
        }

        const payload = { sub: user.id, email: user.email };
        const access_token = this.jwtService.sign(payload);

        return {
            access_token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                provider: user.provider,
            },
        };
    }

    async validateUser(id: string) {
        return await this.userService.findById(id);
    }

    private generateTokenResponse(user: JwtPayload) {
        const payload = { id: user.id };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: this.JWT_ACCESS_TOKEN_TTL,
        });
        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: this.JWT_REFRESH_TOKEN_TTL,
        });

        return {
            accessToken,
            refreshToken
        };
    }
}
