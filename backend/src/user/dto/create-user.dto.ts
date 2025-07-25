import { IsEmail, IsString, IsOptional, IsUrl, IsEnum } from 'class-validator';
import { Provider } from '@prisma/client';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsEnum(Provider)
    provider: Provider;

    @IsOptional()
    @IsString()
    googleId?: string;

    @IsOptional()
    @IsUrl()
    avatarUrl?: string;
}
