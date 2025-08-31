import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { Provider } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './interfaces/jwt.interfaces';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_TOKEN_TTL: string;
  private readonly JWT_REFRESH_TOKEN_TTL: string;
  private googleClient: OAuth2Client;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {
    this.JWT_ACCESS_TOKEN_TTL =
      this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_TTL') || '1h';
    this.JWT_REFRESH_TOKEN_TTL =
      this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_TTL') || '7d';


    this.googleClient = new OAuth2Client(
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
    );
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
      provider: Provider.EMAIL,
    });

    return this.auth(user);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.provider !== Provider.EMAIL || !user.password) {
      throw new UnauthorizedException(
        'This email is registered with a different login method',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.auth(user);
  }

  async googleLogin(googleData: GoogleAuthDto) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleData.idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      if (payload.email !== googleData.profile.email) {
        throw new UnauthorizedException('Token and profile data mismatch');
      }

      const existingUser = await this.userService.findByEmail(payload.email);

      if (!existingUser) {
        const user = await this.userService.create({
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          provider: Provider.GOOGLE,
          avatarUrl: payload.picture,
        });

        return this.auth(user);
      } else {
        if (
          !existingUser.googleId &&
          existingUser.provider !== Provider.GOOGLE
        ) {
          throw new UnauthorizedException(
            'This email is registered with a different login method',
          );
        }

        // Update user info in case it changed
        // const updatedUser = await this.userService.update(existingUser.id, {
        //     googleId: payload.sub,
        //     name: payload.name,
        //     avatarUrl: payload.picture,
        // });

        return this.auth(existingUser);
      }
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async validateUser(id: string) {
    return await this.userService.findById(id);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.validateUser(payload.id);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.auth(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private auth(user: JwtPayload) {
    const {accessToken, refreshToken} = this.generateTokenResponse(user);

    // Возвращаем оба токена на фронт
    return { 
      accessToken,
      refreshToken 
    };
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
